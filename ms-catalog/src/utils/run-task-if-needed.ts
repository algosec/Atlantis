import log from '../../../shared/src/utils/log';
import * as moment from 'moment';
import {Moment} from "moment";

export async function runTaskIfNeeded(tenantId: string, title: string, lastRun: Moment, diffBetweenRunsInSeconds: number, task: (tenantId: string)=>void): Promise<Moment> {
    const now: Moment = moment();

    if (lastRun) {
        const diff = now.diff(lastRun, 'seconds');
        if (diff < diffBetweenRunsInSeconds) {
            log.debug(`No need to trigger ${title} since only ${diff} seconds passed since last run (it will run only after ${diffBetweenRunsInSeconds} seconds)`);
            return lastRun;
        } else {
            log.info(`Need to trigger ${title} since ${diff} seconds passed since last run (>= ${diffBetweenRunsInSeconds})`);
        }
    } else {
        log.info(`Need to trigger ${title} since this is the first time`);
    }

    try {
        await task(tenantId);
        return now;
    } catch (e) {
        log.error(`error during ${title} `, e);
        return lastRun;
    }
}