import log from '../../../shared/src/utils/log';
import {transaction} from '../../../shared/src/services/db';
import {IFeatureBranch, listAllFeatureBranches} from '../services/feature-branches/list-all-feature-branches';
import {forEach} from "p-iteration";

async function executeSync(tenantId, dbConnection) {
    log.info('Syncing Feature-Branches...');

    const featureBranchesList: IFeatureBranch[] = await listAllFeatureBranches(tenantId);

    const [teams] = await dbConnection.query('SELECT id, version FROM teams WHERE tenantId = ? ORDER BY `order` DESC', [tenantId]);
    const teamIdByVersion = Object.fromEntries(teams.map(e => [e.version, e.id]));

    const [existingBranches] = await dbConnection.query('select * from branches where tenantId = ?', [tenantId]);
    let updatesCount = 0, createdCount = 0;

    await forEach(featureBranchesList, async (branch: IFeatureBranch) => {
        // search for existing branch - either identifiers include version or both team and title are the same
        const exitingBranch = existingBranches.find(b => b.identifiers.includes(branch.versionBranch) || (b.team === teamIdByVersion[branch.version] && b.title.toLowerCase() === branch.title.toLowerCase()));

        if (exitingBranch) {
            updatesCount++;
            if (!exitingBranch.identifiers.includes(branch.versionBranch)) {
                exitingBranch.identifiers.push(branch.versionBranch);
            }
            await dbConnection.query('update branches set title = ?, identifiers = ?, jiraIssue = ?, gitBranch = ? where tenantId = ? and id = ? ', [branch.title, JSON.stringify(exitingBranch.identifiers), branch.jiraIssue, branch.gitBranch, tenantId, exitingBranch.id]);
        } else {
            createdCount++;
            await dbConnection.query('INSERT INTO branches (tenantId, team, title, identifiers, jiraIssue, gitBranch) VALUES ?', [[[
                tenantId,
                teamIdByVersion[branch.version],
                branch.title,
                JSON.stringify([branch.versionBranch]),
                branch.jiraIssue,
                branch.gitBranch
            ]]]);
        }
    });

    log.info(`${updatesCount} branches were updated, ${createdCount} branches were created`);
}

export async function syncFeatureBranches(tenantId: string): Promise<void> {
    await transaction(async (dbConnection) => await executeSync(tenantId, dbConnection));
}