import log from '../../../../shared/src/utils/log';
import {
    ChannelExternalEntityInfo,
    createBranch, getChannelExternalEntityInfo,
    getChannelIdByTeamAndName,
    getLatestCard,
    getTeamByVersion, IBranchCreate, ICardCreate, insertExternalEntity,
    insertNewCard,
    insertNewChannel, setBranchArchived,
    updateBranchIdentifiers, updateCardWithExternalEntity, updateChannelWithExternalEntity
} from '../../services/dao';
import {createChannel, IChannelResponse, loadChannels} from '../../services/teams/teams-channels';
import * as allureCardTemplate from '../../resources/card-templates/allure-card.template.json';
import {cardTemplateBinder} from '../../services/card-template-binder';
import {IPostMessageResponse, postMessage} from '../../services/teams/teams-message';
import {syncWithJenkins} from '../../tasks/sync-with-jenkins';
import {areEquivalentCards} from '../../services/are-equivalent-cards';
import {runTaskIfNeeded} from '../../utils/run-task-if-needed';
import {getBranchPrefixFromBuild, getThirdPart} from '../../utils/build-parser';
import {calculateCardBranch} from '../../tasks/calculate-card-branch';
import {listAllFeatureBranches} from '../../services/feature-branches/list-all-feature-branches';
import { v4 as uuidv4 } from 'uuid';
import {internalServerError} from "../../../../shared/src/utils/response-composer";
import {fetchUser} from "../../../../shared/src/auth/authentication";
import {Moment} from "moment";
import {Request, Response} from "express";
import {ITeam} from "../../../../shared/src/model";

const RECEIVED_WITHOUT_NOTIFICATION_PREFIX = 'Received without posting to Teams';
const SKIP_NOTIFICATION_PREFIX = 'Skipping notification';
const CARD_FIELDS = [
    'jobName',
    'team',
    'build',
    'url',
    'branch',
    'passed',
    'skipped',
    'skippedByUser',
    'failed',
    'failedTests',
    'metaData'
];

const META_DATA_MANDATORY_FIELDS = [
    'automationBranch'
];

const MAX_FAILED_TEST_SIZE = 10;
const FEATURE_BRANCH_PREFIX = "feature/";

const JENKINS_SYNC_MINIMUM_DIFF_IN_SECONDS = 60 * 30; // 30 minutes
let lastJenkinsSync: Moment; // TODO: support multi-tenant

async function  listAllFeatureBranchesNoFail(tenantId: string) {
    try {
        return await listAllFeatureBranches(tenantId);
    } catch (e) {
        log.warn("Failed to list feature branches - ignoring it", e);
        return [];
    }
}

function isStabilization(cardData): boolean {
    return cardData.jobName.endsWith("-STABILIZATION");
}

function composeTargetChannel(jobName) {
    const targetChannel = jobName
        .replace(/^.*-CI-3-/,'') // remove the version prefix, as the channel name should be less than 50 chars
        .replace(/-STABILIZATION$/, ''); // remove stabilization marker - they should be on the same channel

    // send all the upgrade notification to the same channel, other jobs have their own channel
    return targetChannel.startsWith("upgrade") ? "upgrade" : targetChannel;
}

async function getChannelCreateIfMissing(tenantId: string, teamId: string, channelTitle: string): Promise<string> {
    const channelId = await getChannelIdByTeamAndName(tenantId, teamId, channelTitle);

    if (channelId) {
        return channelId;
    }

    log.info(`Creating channel '${channelTitle}' for team '${teamId}'`);
    return await insertNewChannel(tenantId, teamId, channelTitle);
}

interface ChannelCreateResponse {
    teamExternalId: string;
    channelExternalId: string;
}

async function getChannelInTeamsAndCreateIfMissing(tenantId, channelId): Promise<ChannelCreateResponse> {
    const channelExternalEntityInfo: ChannelExternalEntityInfo = await getChannelExternalEntityInfo(tenantId, channelId);
    const {channelTitle, teamExternalId, garbageChannelExternalId} = channelExternalEntityInfo;
    let {channelExternalId} = channelExternalEntityInfo;

    // create channel if does not exist
    if (!channelExternalId) {
        // create new channel in Teams
        log.info(`Creating Microsoft Teams's channel '${channelTitle}' in team ${teamExternalId})`);

        let newChannelData: IChannelResponse = await createChannel(teamExternalId, channelTitle);

        if (newChannelData?.error?.message) {
            if (newChannelData.error.message.includes('Channel name already existed')) {
                // in case the channel is already exist in Teams - look for its data
                const allChannels = await loadChannels(teamExternalId);
                newChannelData = allChannels.find(x => x.displayName === channelTitle);
            } else {
                log.warn(`could not to create new channel '${channelTitle}' in team ${teamExternalId} due to: ${newChannelData.error.message} - sending to garbage channel instead`);
                channelExternalId = garbageChannelExternalId;
                return {teamExternalId, channelExternalId};
            }
        }

        const externalEntityId = uuidv4();
        channelExternalId = newChannelData.id;
        await insertExternalEntity(tenantId, externalEntityId, channelExternalId, newChannelData.webUrl);
        await updateChannelWithExternalEntity(tenantId, channelId, externalEntityId);
    }

    return {teamExternalId, channelExternalId};
}

async function processAndAlterCardData(tenantId, cardData) {
    // validate all fields exists
    const missingFields = CARD_FIELDS.filter(k => !(k in cardData && cardData[k] !== null));
    if (missingFields.length > 0) {
        return `${SKIP_NOTIFICATION_PREFIX} - Request missing the following fields: ${missingFields.join(", ")}`;
    }
    // validate no other fields exists
    const excessiveFields = Object.keys(cardData).filter(k => !CARD_FIELDS.includes(k));
    if (excessiveFields.length > 0) {
        return `${SKIP_NOTIFICATION_PREFIX} - Request has excessive fields: ${excessiveFields.join(", ")}`;
    }
    // validate required meta data fields exists
    const missingMetaDataFields = META_DATA_MANDATORY_FIELDS.filter(k => !(k in cardData.metaData && cardData.metaData[k] !== null));
    if (missingMetaDataFields.length > 0) {
        return `${SKIP_NOTIFICATION_PREFIX} - MetaData missing the following fields: ${missingMetaDataFields.join(", ")}`;
    }
    // validate meta data values are strings
    const metaDataNotString = Object.keys(cardData.metaData).filter(k => !(typeof cardData.metaData[k] === 'string'));
    if (metaDataNotString.length > 0) {
        return `${SKIP_NOTIFICATION_PREFIX} - MetaData fields must be strings: ${metaDataNotString.join(", ")}`;
    }

    // parse and validate team
    cardData.version = cardData.team;
    const team: ITeam = await getTeamByVersion(tenantId, cardData.version);
    if (!team) {
        return `${SKIP_NOTIFICATION_PREFIX} - no team was found for version '${cardData.version}'`;
    }

    // ugly, until we will rename it in DB
    cardData.team = team.id;

    // Sometimes the wrong parameters are sent for notifications,
    // mainly caused by human errors, so this code is meant to
    // catch those errors and fix them.
    cardData.runMode = (cardData.branch && cardData.branch !== "main") ? cardData.branch.toLowerCase() : "master";
    cardData.runMode = fixHumanErrorsInRunMode(cardData);

    // branch validations
    cardData.branch = await calculateCardBranch(tenantId, cardData); // might be null - it indicates that it has to be created

    //filtering of not necessary builds
    if (cardData.build.match(/^\d+\.\d+\.1\.\d+$/) && (!cardData.branch || !cardData.branch.identifiers.includes(cardData.build))) {
        return `${SKIP_NOTIFICATION_PREFIX} - the tested build (${cardData.build}) is a side-build (not official)`;
    }
    //another filter
    if (!team.allowedAutomationBranches.includes(cardData.metaData.automationBranch)
        && !cardData.metaData.automationBranch.startsWith(FEATURE_BRANCH_PREFIX)
        && (!cardData.branch || !cardData.branch.identifiers.includes(cardData.metaData.automationBranch))
        && !isStabilization(cardData)
    ) {
        return `${SKIP_NOTIFICATION_PREFIX} - job wasn't run on automation master branch (${team.allowedAutomationBranches.join(" or ")}) or a feature branch (${FEATURE_BRANCH_PREFIX})- it was run on ${cardData.metaData.automationBranch}`;
    }

    // calculate target channel, and check if need to send notification
    cardData.targetChannelTitle = composeTargetChannel(cardData.jobName);
    if (cardData.targetChannelTitle === 'upgrade' && cardData.failed === 0) {
        return `${SKIP_NOTIFICATION_PREFIX} - No need to send card for successful upgrade`;
    }

    cardData.title = cardData.jobName;
    cardData.skipped += cardData.skippedByUser;

    // remove unnecessary fields
    delete cardData.skippedByUser;

    // limit the size of the failed tests since there is
    // a limit on the size of each card in MS Teams
    const failedLength = cardData.failedTests.length;
    if (failedLength > MAX_FAILED_TEST_SIZE) {
        cardData.failedTests = [
            ...cardData.failedTests.slice(0, MAX_FAILED_TEST_SIZE),
            `Additional ${failedLength-MAX_FAILED_TEST_SIZE} failures...`
        ];
    }

    return null;
}

async function injectPreviousCardAndEquivalentCard(tenantId: string, cardData) {
    cardData.previousCard = null;
    cardData.oldestEquivalentCard = null;

    const previousCard = await getLatestCard(tenantId, cardData.channel, cardData.title, cardData.branch.id);
    if (!previousCard) {
        return;
    }

    cardData.previousCard = previousCard.id;

    if (areEquivalentCards(cardData, previousCard)) {
        cardData.oldestEquivalentCard = previousCard.oldestEquivalentCard ? previousCard.oldestEquivalentCard : previousCard.id;
    }
}

function fixHumanErrorsInRunMode(cardData): string {
    // human errors are when the value is the master (as it's the default)
    if (cardData.runMode === 'master') {
        // error #1
        if (cardData.metaData.automationBranch.startsWith(FEATURE_BRANCH_PREFIX)) {
            const newRunMode = getThirdPart(cardData.metaData.automationBranch);
            if (newRunMode) {
                log.warn(`Found human error - replacing runMode to '${newRunMode}' (job: ${cardData.jobName})`);
                return newRunMode;
            }
        }
    }

    return cardData.runMode;
}

async function injectBranchIfMissingAndUpdate(tenantId: string, cardData) {
    const versionBranch = getBranchPrefixFromBuild(cardData.build);

    if (cardData.branch) {
        // if branch was found with versionBranch identifier, and the runMode is
        // not in the identifiers - add this runMode to the identifiers list.
        if (cardData.runMode !== "master" && !cardData.branch.identifiers.includes(cardData.runMode) && cardData.branch.identifiers.includes(versionBranch)) {
            log.info(`Adding a new identifier '${cardData.runMode}' to branch '${cardData.branch.title}' of team '${cardData.branch.team}'`);
            await updateBranchIdentifiers(tenantId, cardData.branch.id, [...cardData.branch.identifiers, cardData.runMode]);
        }

        // if new card is sent to an archived branch, then
        // it means that it's still active, so un-archived it.
        if (cardData.branch.archived) {
            log.info(`Archived branch '${cardData.branch.title}' of team '${cardData.branch.team}' got new card - un-archiving it`);
            await setBranchArchived(tenantId, cardData.branch.id, false);
        }

        return true;
    }

    const featureBranchesList = await listAllFeatureBranchesNoFail(tenantId);
    const featureBranch = featureBranchesList.find(x => x.versionBranch === versionBranch);
    const branchToCreate: IBranchCreate = {
        team: cardData.team,
        title: featureBranch ? featureBranch.title : cardData.runMode,
        identifiers: featureBranch ? [versionBranch, cardData.runMode] : [cardData.runMode],
        jiraIssue: featureBranch ? featureBranch.jiraIssue : null,
        gitBranch: featureBranch ? featureBranch.gitBranch : null,
    };

    // create new branch (it may fail if there will be concurrent calls)
    try {
        log.info(`Creating new branch '${branchToCreate.title}' of team '${branchToCreate.team}' with identifiers ${JSON.stringify(branchToCreate.identifiers)}`);
        await createBranch(tenantId, branchToCreate);
    } catch (e) {
        log.warn(`failed to create branch '${branchToCreate.title}'`, e);
    }

    // re-calculate card branch - it should find the one that was created in the last stop
    cardData.branch = await calculateCardBranch(tenantId, cardData);

    if (cardData.branch) {
        return true;
    }

    log.error(`could not find branch for card after creation (build=${cardData.build} ; runMode=${cardData.runMode} ; team=${cardData.team})`);
    return false;
}

async function postCardToExternalSystem(tenantId, cardData) {
    try {
        const {teamExternalId, channelExternalId} = await getChannelInTeamsAndCreateIfMissing(tenantId, cardData.channel);

        if (!teamExternalId || !channelExternalId) {
            return `${RECEIVED_WITHOUT_NOTIFICATION_PREFIX} - missing external resources ID`;
        }

        // submit card to Teams Channel
        const composedCard = cardTemplateBinder(allureCardTemplate, cardData);
        const messageResponse: IPostMessageResponse = await postMessage(teamExternalId, channelExternalId, composedCard);
        const externalId = messageResponse.id;
        const error = messageResponse?.error?.message || messageResponse?.error || (!externalId && 'empty card id');

        if (error) {
            const skipReason = `failed to send post card for channel '${channelExternalId}' in team '${teamExternalId}': ${error}`;
            log.warn(skipReason);
            return `${RECEIVED_WITHOUT_NOTIFICATION_PREFIX} - ${skipReason}`;
        }

        const externalEntityId = uuidv4();
        const webUrl = `https://teams.microsoft.com/l/message/${channelExternalId}/${externalId}`;

        log.info(`posted card to Teams channel for card id ${cardData.id} - externalId: ${externalId}`);

        await insertExternalEntity(tenantId, externalEntityId, externalId, webUrl);
        await updateCardWithExternalEntity(tenantId, cardData.id, externalEntityId);

        return webUrl;
    } catch (err) {
        log.error("error while sending card to external system", err);
        return `${RECEIVED_WITHOUT_NOTIFICATION_PREFIX} - an internal error occurred: ${err}`;
    }
}

export async function notificationAllure(req: Request, res: Response): Promise<void> {
    const tenantId = fetchUser(req).tenantId;
    const cardData: ICardCreate = req.body;
    const originalBodyJson = JSON.stringify(cardData);

    try {
        // process and alter received card data - exit if failed
        const error = await processAndAlterCardData(tenantId, cardData);
        if (error) {
            log.debug(`Rejected allure notification (${error}) - request: ${originalBodyJson}`);
            res.status(400).send(error);
            return;
        }

        if (! await injectBranchIfMissingAndUpdate(tenantId, cardData)) {
            res.status(500).send(internalServerError("failed to create new branch"));
            return;
        }

        cardData.channel = await getChannelCreateIfMissing(tenantId, cardData.team, cardData.targetChannelTitle);

        await injectPreviousCardAndEquivalentCard(tenantId, cardData);

        // persist card
        cardData.id = await insertNewCard(tenantId, cardData);
        log.info(`added card ${cardData.id} in channel ${cardData.targetChannelTitle} for team ${cardData.version}`);

        // post to external system and get the response for the request
        const response = await postCardToExternalSystem(tenantId, cardData);

        // return the link to the posted message
        res.send(response);
    } catch (e) {
        const newErr = new Error(`failed to process message: ${originalBodyJson} - ${e}`);
        newErr.stack += '\nCaused by: '+e.stack;
        throw newErr;
    }

    // At this point the response has already sent back
    // and we trigger sync with JENKINS (make sure channels has jenkins Job)
    // cleaning non-relevant jobs, not enabled at the moment - need to add a task to configure
    lastJenkinsSync = await runTaskIfNeeded(tenantId, 'sync with Jenkins after mark allure notification', lastJenkinsSync, JENKINS_SYNC_MINIMUM_DIFF_IN_SECONDS, syncWithJenkins);
}
