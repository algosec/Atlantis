import log from '../../../../shared/src/utils/log';
import axios from 'axios';
import {getSetting} from "../../../../shared/src/settings/settings";
import {IJenkinsSettings} from "../../../../shared/src/settings/model";

export interface IJenkinsJobUrlMap {
    [jenkinsJob: string]: string;
}

export async function listAllJenkinsJobs(tenantId: string): Promise<IJenkinsJobUrlMap> {
    const jenkinsConfig = await getSetting<IJenkinsSettings>(tenantId, "jenkins");
    const url = `${jenkinsConfig.baseUrl}/api/json`;
    log.debug(`Search Jenkins Jobs... ${url}`);
    const res = await axios.get(url);
    return res.data.jobs.reduce((hash, elem) => { hash[elem.name] = elem.url; return hash }, {});
}