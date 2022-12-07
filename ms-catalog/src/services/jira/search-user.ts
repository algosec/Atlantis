import log from '../../../../shared/src/utils/log';
import axios from 'axios';
import {getSetting} from "../../../../shared/src/settings/settings";
import {IJiraSettings} from "../../../../shared/src/settings/model";

export async function searchUser(tenantId: string, email: string): Promise<boolean> {
    const jiraConfig = await getSetting<IJiraSettings>(tenantId, "jira");
    const url = `${jiraConfig.baseUrl}/rest/api/2/user/search?username=${escape(email)}`;
    log.debug(`Search user... ${url}`);
    const res = await axios.get(url, {auth: jiraConfig.credentials});

    // look for a user that its email address is as requested
    return res.data.map(u => u.emailAddress).some(u => u === email);
}
