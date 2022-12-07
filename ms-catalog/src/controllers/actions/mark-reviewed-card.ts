import log from '../../../../shared/src/utils/log';
import {getCardByExternalId, getDefectsIdsByChannel, isLatestCard, markCardAsReviewed} from '../../services/dao';
import {syncWithJira} from '../../tasks/sync-with-jira';
import {runTaskIfNeeded} from '../../utils/run-task-if-needed';
import {fetchUser} from "../../../../shared/src/auth/authentication";
import {Moment} from "moment";
import {Request, Response} from "express";
import {getSetting} from "../../../../shared/src/settings/settings";
import {EmailList} from "../../../../shared/src/settings/model";
import {globalConfig} from "../../../../shared/src/globalConfig"

const JIRA_SYNC_MINIMUM_DIFF_IN_SECONDS = 60 * 10; // 10 minutes
let lastJiraSync: Moment; // TODO: support multi-tenant

function extractConversationId(data) {
    return data['conversation']
        && data['conversation']['id']
        && data['conversation']['id'].replace(/.*;messageid=/,'');
}

function extractReplayId(data) {
    return data['id'];
}

function extractUser(data) {
    return data['from'] && data['from']['name'];
}

function getUserEmail(user) {
    return user && user.toLowerCase().replace(" ", ".") + globalConfig.emailDetails.domain;
}

function composeResponse(html) {
    return {
        type: "html",
        text: html
    }
}

function composeNoDefectsMessage() {
    const template = `
<p>
    Warning: there are <b>no</b> open defects attached to this bug - are you sure you want to mark as reviewed?
</p>
<p style="font-size: 0.85em; color: #a4a4a5; margin-top: 5px;">
    Replay <b>again</b> and mention the the relevant <b>QA team leader</b> to approve, if you still wish to mark this card as reviewed without opening bug.
</p>`;

    return composeResponse(template);
}

function composeBypassCantBeUsedMessage() {
    const template = `
<p>
    Warning: Only <b>QA Team leaders</b> can use bypass.
</p>
<p style="font-size: 0.85em; color: #a4a4a5; margin-top: 5px;">
    Replay <b>again</b> and mention the the relevant <b>QA team leader</b> to approve.
</p>`;

    return composeResponse(template);
}

function composeReviewedFinishedMessage(reviewerUser: string, openDefects: string[]) {
    let defectsNote = 'No open defect at the time of the review';
    if (openDefects.length > 0) {
        const baseJiraUrl = globalConfig.jiraUrl
        const linksToDefects = openDefects.map(defectId => `<a href="http://${baseJiraUrl}/browse/${defectId}">${defectId}</a>`).join(", ");
        defectsNote = `Open defects at the time of the review: ${linksToDefects}`;
    }

    const template = `
<p>
    Thanks ${reviewerUser}! This card was marked as reviewed.
</p>
<p style="font-size: 0.85em; color: #a4a4a5; margin-top: 5px;">
    ${defectsNote}
</p>`;

    return composeResponse(template);
}

export async function markReviewedCard(req: Request, res: Response): Promise<void> {
    const tenantId = fetchUser(req).tenantId;
    const conversationId = extractConversationId(req.body);
    const replayId = extractReplayId(req.body);
    const reviewerUser = extractUser(req.body);
    const reviewerEmail = getUserEmail(reviewerUser);
    const textMessage = req.body.text;

    if (!conversationId || !replayId || !reviewerEmail || !textMessage) {
        res.send(composeResponse('Error: bad request'));
        return;
    }

    // check if this is a new conversation
    if (conversationId === replayId) {
        res.send(composeResponse('Error: this bot can be used in reply only!'));
        return;
    }

    const card = await getCardByExternalId(tenantId, conversationId);

    if (!card) {
        res.send(composeResponse('Error: unknown card'));
        return;
    }

    if (card.failed === 0) {
        res.send(composeResponse(`No need to review passed tests`));
        return;
    }

    if (card.reviewed) {
        res.send(composeResponse(`Thanks ${reviewerUser}! Nothing was updated since this card was already marked as reviewed before.`));
        return;
    }

    if (!await isLatestCard(tenantId, card.id)) {
        res.send(composeResponse(`Can't review outdated card. Please review latest card.`));
        return;
    }

    let wasBypassUsed = false;
    const openDefects = await getDefectsIdsByChannel(tenantId, card.channel);

    // reject mark review if no open defects for this channel (unless bypass by the authorized people)
    if (openDefects.length === 0) {
        wasBypassUsed = textMessage.toLowerCase().includes("bypass");
        if (!wasBypassUsed) {
            res.send(composeNoDefectsMessage());
            return;
        } else if (!(await getSetting<EmailList>(tenantId, "allowToUseReviewedBypass")).includes(reviewerEmail)) {
            res.send(composeBypassCantBeUsedMessage());
            return;
        }
    }

    // mark as reviewed in DB
    await markCardAsReviewed(tenantId, card.id, card.oldestEquivalentCard, wasBypassUsed, reviewerEmail);

    // done - return result
    log.info(`card '${card.id}' was marked as reviewed by ${reviewerEmail}`);

    // return the response
    res.send(composeReviewedFinishedMessage(reviewerUser, openDefects));

    // At this point the response has already sent back
    // and we trigger sync with JIRA (get new bugs, etc.)
    lastJiraSync = await runTaskIfNeeded(tenantId, 'sync with Jira after mark reviewed card', lastJiraSync, JIRA_SYNC_MINIMUM_DIFF_IN_SECONDS, syncWithJira);
}