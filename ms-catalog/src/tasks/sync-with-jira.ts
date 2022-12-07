import log from '../../../shared/src/utils/log';
import {transaction} from '../../../shared/src/services/db';
import {IDefectFromJira, loadDefect, loadDefects} from '../services/jira/load-defects';
import * as moment from 'moment';
import {map} from 'p-iteration';
import {versionToDisplayName} from "../utils/build-parser";
import {IChannelAndVersion} from "../../../shared/src/model";

async function fetchExistingDefectsIds(tenantId: string, dbConnection) {
    const [existingDefects] = await dbConnection.query('SELECT id FROM defects where tenantId = ?', [tenantId]);
    return existingDefects.map(c => c.id);
}

async function fetchChannels(tenantId: string, dbConnection) {
    const [channels] = await dbConnection.query('SELECT channels.id, channels.title, teams.version FROM channels LEFT JOIN teams ON teams.id = channels.team WHERE channels.tenantId = ?;', [tenantId]);
    return channels;
}

async function computeChanges(tenantId, defectsFromJira: IDefectFromJira[], existingDefectsIds) {
    const rowsUnmatched = new Set(existingDefectsIds);
    const rowsToUpdate = await map(defectsFromJira, async defect => {
        rowsUnmatched.delete(defect.issueId);
        return [
            defect.issueId,
            tenantId,
            defect.summary,
            defect.issueType,
            defect.status,
            defect.assignee,
            defect.rndTeam,
            moment(defect.created).format('YYYY-MM-DD HH:mm:ss'),
            moment(defect.lastUpdate).format('YYYY-MM-DD HH:mm:ss'),
            defect.severity
        ];
    });

    return [rowsToUpdate, [...rowsUnmatched]];
}

async function computeRelationships(tenantId: string, defectsFromJira: IDefectFromJira[], channels) {
    const channelsToDefectsMapping = [];

    channels.forEach(channel => defectsFromJira.filter(defect => isDefectRelevantForChannel(channel, defect)).forEach(defect => channelsToDefectsMapping.push([
        tenantId,
        channel.id,
        defect.issueId
    ])));

    return channelsToDefectsMapping;
}

export function doDefectAndChannelHaveTheSameVersion(channel: IChannelAndVersion, defect: IDefectFromJira): boolean {
    const channelVersionDisplay = versionToDisplayName(channel.version);
    return defect.affectedVersion.length === 0 // if no affected versions - then allow it even though it's not explicitly set
        || defect.affectedVersion.some(version => version.includes(channelVersionDisplay) || version === 'Simulators');
}

function isDefectRelevantForChannel(channel, defect: IDefectFromJira) {
    if (!doDefectAndChannelHaveTheSameVersion(channel, defect)) {
        return false;
    }

    if (defect.relevantTests.length > 0) {
        return defect.relevantTests.includes(channel.title);
    }

    return defect.relevantJobs.some(test => new RegExp(test.replace(/\W+/g, '-').replace(/-{2,}/,'-'), "ig").test(channel.title));
}

async function persistDefects(dbConnection, rowsToUpdate) {
    if (rowsToUpdate.length > 0) {
        log.info(`going to update ${rowsToUpdate.length} defects`);
        await dbConnection.query(`INSERT INTO defects (id, tenantId, summary, issueType, status, assignee, rndTeam, created, lastUpdate, severity) VALUES ? ON DUPLICATE KEY UPDATE tenantId = VALUES(tenantId), summary = VALUES(summary), issueType = VALUES(issueType), status = VALUES(status), assignee = VALUES(assignee), rndTeam = VALUES(rndTeam), created = VALUES(created), lastUpdate = VALUES(lastUpdate), severity = VALUES(severity);`, [rowsToUpdate]);
    }
}

async function persistDeletedDefects(tenantId: string, dbConnection, rowsToDelete) {
    if (rowsToDelete.length > 0) {
        log.info(`going to delete ${rowsToDelete.length} defects`);
        await dbConnection.query(`DELETE from defects WHERE tenantId = ? AND id IN ?;`, [tenantId, [rowsToDelete]]);
    }
}

async function persistDeleteChannelsToDefectsMapping(tenantId: string, dbConnection) {
    await dbConnection.query(`DELETE FROM channels_defects WHERE tenantId = ?;`, [tenantId]);
}

async function persistChannelsToDefectsMapping(dbConnection, channelsToDefectsMapping) {
    if (channelsToDefectsMapping.length > 0) {
        log.info(`going to set ${channelsToDefectsMapping.length} channels <> defects relationships`);
        await dbConnection.query(`INSERT INTO channels_defects VALUES ? ON DUPLICATE KEY UPDATE tenantId = VALUES(tenantId), channel = VALUES(channel), defect = VALUES(defect);`, [channelsToDefectsMapping]);
    }
}

async function executeSync(tenantId: string, dbConnection, isFullSync: boolean, defectsFromJira: IDefectFromJira[]) {
    // fetch information
    const channels = await fetchChannels(tenantId, dbConnection);
    const existingDefectsIds = await fetchExistingDefectsIds(tenantId, dbConnection);

    // do calculation
    const [rowsToUpdate, rowsToDelete] = await computeChanges(tenantId, defectsFromJira, existingDefectsIds);
    const channelsToDefectsMapping = await computeRelationships(tenantId, defectsFromJira, channels);

    // persist data
    if (isFullSync) {
        await persistDeletedDefects(tenantId, dbConnection, rowsToDelete);
        await persistDeleteChannelsToDefectsMapping(tenantId, dbConnection);
    }
    await persistDefects(dbConnection, rowsToUpdate);
    await persistChannelsToDefectsMapping(dbConnection, channelsToDefectsMapping);
}

export async function syncWithDefect(tenantId: string, defectId: string): Promise<void> {
    await transaction(async dbConnection => {
        const defectFromJira: IDefectFromJira = await loadDefect(tenantId, defectId);
        await executeSync(tenantId, dbConnection, false, [defectFromJira]);
    });
}

export async function syncWithJira(tenantId: string): Promise<void> {
    await transaction(async (dbConnection) => {
        log.info('Syncing with Jira...');
        const defectsFromJira: IDefectFromJira[] = await loadDefects(tenantId);
        await executeSync(tenantId, dbConnection, true, defectsFromJira);
    });
}
