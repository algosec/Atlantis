import log from '../../../shared/src/utils/log';
import {transaction} from '../../../shared/src/services/db';
import {IChannelResponse, loadChannels} from '../services/teams/teams-channels';
import {map, forEach} from 'p-iteration';

async function fetchExistingChannelsIds(tenantId: string, dbConnection) {
    const [existingChannels] = await dbConnection.query('SELECT id FROM channels WHERE tenantId = ?', [tenantId]);
    return existingChannels.map(c => c.id);
}

async function computeChanges(tenantId: string, teams, existingChannelsIds) {
    const rowsToUpdate = [];
    const rowsUnmatched = new Set(existingChannelsIds);

    await forEach(teams, async (team: ITeamAndVersion) => {
        log.info(`Updating channels for ${team.version} team (${team.id})`);
        const rowsToUpdateCurrentTeam = await map(await loadChannels(team.id), async (channel: IChannelResponse) => {
            rowsUnmatched.delete(channel.id);
            return [
                channel.id,
                tenantId,
                team.id,
                channel.displayName,
                channel.webUrl
            ];
        });
        log.info(`Found ${rowsToUpdateCurrentTeam.length} channels for in ${team.version} team`);
        rowsToUpdate.push(...rowsToUpdateCurrentTeam);
    });

    return [rowsToUpdate, [...rowsUnmatched]];
}

async function persistChanges(tenantId: string, dbConnection, rowsToUpdate, rowsToDelete) {
    if (rowsToUpdate.length > 0) {
        log.info(`going to update ${rowsToUpdate.length} channels`);
        await dbConnection.query(`INSERT INTO channels (id, tenantId, team, title, webUrl) VALUES ? ON DUPLICATE KEY UPDATE tenantId = VALUES(tenantId), team = VALUES(team), title = VALUES(title), webUrl = VALUES(webUrl);`, [rowsToUpdate]);
    }

    if (rowsToDelete.length > 0) {
        log.info(`going to delete ${rowsToDelete.length} channels (${rowsToDelete})`);
        await dbConnection.query(`DELETE from channels WHERE tenantId = ? AND id IN ?;`, [tenantId, [rowsToDelete]]);
    }
}

interface ITeamAndVersion {
    id: string;
    version: string;
}

async function executeSync(tenantId: string, dbConnection) {
    log.info('Syncing with Teams...');

    // fetch information
    const [teams]: [ITeamAndVersion[]] = await dbConnection.query('SELECT id, version FROM teams WHERE tenantId = ?', [tenantId]);
    const existingChannelsIds = await fetchExistingChannelsIds(tenantId, dbConnection);

    // do calculation
    const [rowsToUpdate, rowsToDelete] = await computeChanges(tenantId, teams, existingChannelsIds);

    // persist data
    await persistChanges(tenantId, dbConnection, rowsToUpdate, rowsToDelete);
}

export async function syncWithTeams(tenantId: string): Promise<void> {
  await transaction(async (dbConnection) => await executeSync(tenantId, dbConnection));
}