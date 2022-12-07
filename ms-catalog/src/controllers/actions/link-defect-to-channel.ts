import {getDefectRawJiraIssue, IDefectFromJiraRaw, transformRawJiraIssueToDefect, updateDefect} from "../../services/jira/load-defects";
import {getChannelById, isDefectLinkedToChannel} from "../../services/dao";
import {badRequest, internalServerError, ok} from "../../../../shared/src/utils/response-composer";
import log from "../../../../shared/src/utils/log";
import {doDefectAndChannelHaveTheSameVersion, syncWithDefect} from "../../tasks/sync-with-jira";
import {versionToDisplayName} from "../../utils/build-parser";
import {fetchUser} from "../../../../shared/src/auth/authentication";
import {Request, Response} from "express";
import {IChannelAndVersion} from "../../../../shared/src/model";
import {getSetting} from "../../../../shared/src/settings/settings";
import {IJiraSettings} from "../../../../shared/src/settings/model";

function getVersionMismatchMessage(defectData, channel: IChannelAndVersion) {
    let msg = `defect ${defectData.issueId} could not be linked to channel '${channel.title}' of version ${versionToDisplayName(channel.version)} since it `;
    if (defectData.affectedVersion.length === 0) {
        msg += "does not affect any version";
    } else if (defectData.affectedVersion.length === 1) {
        msg += `affects different version ${defectData.affectedVersion}`;
    } else {
        msg += `affects different versions ${defectData.affectedVersion}`;
    }
    return msg;
}

export async function linkDefectToChannel(req: Request, res: Response): Promise<void> {
    const tenantId = fetchUser(req).tenantId;
    const channelId = req.params.channelId;
    const defectId = req.body.defectId;

    // get channel
    const channel: IChannelAndVersion = await getChannelById(tenantId, channelId);
    if (!channel) {
        res.status(400).send(badRequest(`channel ${channelId} does not exist`));
        return;
    }

    // check if defect already linked to channel
    if (await isDefectLinkedToChannel(tenantId, channelId, defectId)) {
        res.send(ok(`defect ${defectId} is already linked to channel '${channel.title}'`));
        return;
    }

    // get issue
    const rawDefectData: IDefectFromJiraRaw = await getDefectRawJiraIssue(tenantId, defectId);
    if (!rawDefectData) {
        res.status(400).send(badRequest(`defect ${defectId} does not exist`));
        return;
    }

    // make sure versions are matching between channel and defect
    const defectData = await transformRawJiraIssueToDefect(tenantId, rawDefectData);
    if (!doDefectAndChannelHaveTheSameVersion(channel, defectData)) {
        const msg = getVersionMismatchMessage(defectData, channel);
        log.warn(msg);
        res.status(400).send(badRequest(`${msg}\n\nSet relevant version in JIRA and try again`));
        return;
    }

    // send update request to JIRA
    log.info(`Going to assign defect ${defectId} to channel '${channel.title}' (${channelId})`);
    const jiraConfig = await getSetting<IJiraSettings>(tenantId, "jira");
    const previousValue = rawDefectData.fields[jiraConfig.fields.failingTestCaseNameField];
    const data = {};
    data[jiraConfig.fields.failingAutomationField] = [{"value": "Yes"}];
    data[jiraConfig.fields.failingTestCaseNameField] = previousValue ? `${previousValue}\n${channel.title}` : channel.title;
    await updateDefect(tenantId, defectId, data);

    // sync with JIRA for that issue (after it was updated)
    await syncWithDefect(tenantId, defectId);

    // check if defect was linked to channel
    if (! await isDefectLinkedToChannel(tenantId, channelId, defectId)) {
        const msg = `defect ${defectId} supposed to be linked to channel '${channel.title}', however, it isn't`;
        log.error(msg);
        res.status(500).send(internalServerError(`defect ${defectId} supposed to be linked to channel '${channel.title}', however, it isn't`));
        return;
    }

    res.send(ok(`defect ${defectId} was linked to channel '${channel.title}'`));
}