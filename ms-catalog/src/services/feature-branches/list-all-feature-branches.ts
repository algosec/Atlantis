import log from '../../../../shared/src/utils/log';
import axios from 'axios';
import * as https from 'https';
import {getVersionFromBuild} from '../../utils/build-parser';
import {getSetting} from "../../../../shared/src/settings/settings";
import {IFeatureBranchSetting} from "../../../../shared/src/settings/model";

const parser = /^(feature\/([^/:]*)\/([^/:]*)\/([^/:]*)):(.*)$/gm;

export interface IFeatureBranch {
    title: string;
    jiraIssue: string;
    version: string;
    versionBranch: string;
    gitBranch: string;
}

export async function listAllFeatureBranches(tenantId: string): Promise<IFeatureBranch[]> {
    const config = await getSetting<IFeatureBranchSetting>(tenantId, 'featureBranches');

    log.debug(`Search Feature Branches... ${config.url}`);
    const res = await axios.get(config.url, {
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        }),
        auth: {
            username: config.user,
            password: config.pass
        }
    });

    // transform "feature/v3200.0.0/Java_11_upgrade/ASMS-16837:3200.0.22" to an object   { //todo
    //     title: 'Java_11_upgrade',
    //     jiraIssue: 'ASMS-16837',
    //     version: '3200.0',
    //     versionBranch: '3200.0.22',
    //     gitBranch: 'feature/v3200.0.0/Java_11_upgrade/ASMS-16837'
    //   }

    return [...res.data.matchAll(parser)].map(x => ({
        title: x[3],
        jiraIssue: x[4],
        version: getVersionFromBuild(x[5]),
        versionBranch: x[5],
        gitBranch: x[1]
    }));
}