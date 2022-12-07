import log from '../../../shared/src/utils/log';
import {transaction} from '../../../shared/src/services/db';
import {map} from 'p-iteration';
import {IJenkinsJobUrlMap, listAllJenkinsJobs} from '../services/jenkins/list-all-jenkins-jobs';

interface IChannelInfo {
    id: string;
    title: string;
    version: string;
}

async function executeSync(tenantId: string, dbConnection) {
    log.info('Syncing with Jenkins...');

    // fetch information
    const [rows]: [IChannelInfo[]] = await dbConnection.query('select channels.id, channels.title, teams.version from channels join teams on teams.id = channels.team where channels.tenantId = ?', [tenantId]);

    const allJenkinsJobs: IJenkinsJobUrlMap = await listAllJenkinsJobs(tenantId);
    let matchedCount = 0;
    let unmatchedCount = 0;

    await map(rows, async (row: IChannelInfo) => {
        const jobName = `v${row.version}.0-CI-3-${row.title}`;
        const jobNameStabilization = `${jobName}-STABILIZATION`;
        const jobUrl: string = allJenkinsJobs[jobName];
        const jobUrlStabilization: string = allJenkinsJobs[jobNameStabilization];
        let link;

        if (!jobUrl && !jobUrlStabilization) {
            unmatchedCount++;
        } else {
            matchedCount++;
            link = jobUrl || jobUrlStabilization; // give precedence for the regular job

            if (jobUrl && jobUrlStabilization) {
                log.warn(`both regular jenkins job (${jobName}) and stabilization jenkins jobs (${jobNameStabilization}) exists - please check it`);
            }
        }

        await dbConnection.query(`UPDATE channels SET jenkinsJob = ? where tenantId = ? and id = ?`, [link, tenantId, row.id]);
    });

    log.info(`Finished sync with Jenkins (${matchedCount} matched, ${unmatchedCount} not matched)`);
}

export async function syncWithJenkins(tenantId: string): Promise<void> {
  await transaction(async (dbConnection) => await executeSync(tenantId, dbConnection));
}