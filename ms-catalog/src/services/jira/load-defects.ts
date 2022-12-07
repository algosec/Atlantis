import log from '../../../../shared/src/utils/log';
import axios from 'axios';
import {getSetting} from "../../../../shared/src/settings/settings";
import {IJiraSettings} from "../../../../shared/src/settings/model";
import {map} from 'p-iteration';

export interface IDefectFromJira {
    issueId: string;
    summary: string;
    issueType: string;
    status: string;
    assignee: string;
    rndTeam: string;
    created: Date;
    lastUpdate: Date;
    severity: string;

    // meta data
    relevantJobs: string[];
    relevantTests: string[];
    affectedVersion: string[];
}

export type JiraFieldValue = {
    name?: string;
    value?: string;
    emailAddress?: string;
}

export interface IDefectFromJiraRaw {
    key: string;
    fields: {
        [name: string]: string | Date | JiraFieldValue | JiraFieldValue[];
    }
}

async function composeIssueUrl(tenantId: string, issueId: string): Promise<string> {
    return  `${(await getSetting<IJiraSettings>(tenantId, "jira")).baseUrl}/rest/api/2/issue/${issueId}`;
}

export async function transformRawJiraIssueToDefect(tenantId: string, rawIssueFromJira: IDefectFromJiraRaw): Promise<IDefectFromJira> {
    if (!rawIssueFromJira) {
        return null;
    }
    return {
        issueId: rawIssueFromJira.key,
        summary: <string> rawIssueFromJira.fields.summary,
        issueType: (<JiraFieldValue> rawIssueFromJira.fields.issuetype).name,
        status: (<JiraFieldValue> rawIssueFromJira.fields.status).name,
        assignee: (rawIssueFromJira.fields.assignee === null) ? 'Unknown' : (<JiraFieldValue> rawIssueFromJira.fields.assignee).emailAddress,
        rndTeam: (<JiraFieldValue> rawIssueFromJira.fields.customfield_13903 || {}).value || 'Unknown',
        created: <Date> rawIssueFromJira.fields.created,
        lastUpdate: <Date> rawIssueFromJira.fields.updated,
        severity: (<JiraFieldValue> rawIssueFromJira.fields.customfield_14104 || {}).value || 'Unknown',

        // meta data (used to match defect to channel)
        relevantJobs: (<JiraFieldValue[]> rawIssueFromJira.fields.customfield_11902 || []).map(obj => obj.value), // TODO: consider to remove
        relevantTests: (<string> rawIssueFromJira.fields[(await getSetting<IJiraSettings>(tenantId, "jira")).fields.failingTestCaseNameField] || '').split(/\r?\n/).flatMap(x => x.split(',')).map(x => x.replace(/:.*/, '')).filter(x => x),
        affectedVersion: (<JiraFieldValue[]>rawIssueFromJira.fields.versions || []).map(obj => obj.name),
    };
}

export async function loadDefects(tenantId: string): Promise<IDefectFromJira[]> {
    log.debug(`Loading defects from JIRA`);

    const numberOfIssue: number = await numberOfIssues(tenantId);
    const jiraConfig = await getSetting<IJiraSettings>(tenantId, "jira");

    const result = [];
    for(let i = 0; i < numberOfIssue; i += jiraConfig.maxBulk ) { //JIRA limitation - max 1000 issues per request
        const url = `${jiraConfig.baseUrl}/rest/api/2/search?jql=${escape(jiraConfig.jql)}&fields=${jiraConfig.neededFields.join(",")}&startAt=${i}&maxResults=${jiraConfig.maxBulk}`;
        const res = await axios.get(url, {auth: jiraConfig.credentials});
        result.push(...res.data.issues);
    }
    return map(result, async issue => transformRawJiraIssueToDefect(tenantId, issue));
}

async function numberOfIssues(tenantId: string): Promise<number> {
    const jiraConfig = await getSetting<IJiraSettings>(tenantId, "jira");
    const numberOfIssueUrl = `${jiraConfig.baseUrl}/rest/api/2/search?jql=${escape(jiraConfig.jql)}&fields=${jiraConfig.neededFields.join(",")}&startAt=0&maxResults=0&json_result=True`;
    const numberOfIssue = await axios.get(numberOfIssueUrl, {auth: jiraConfig.credentials});
    return numberOfIssue.data.total;
}

export async function loadDefect(tenantId: string, defectId: string): Promise<IDefectFromJira> {
    log.debug(`Loading defect ${defectId} from JIRA`);
    return await transformRawJiraIssueToDefect(tenantId, await getDefectRawJiraIssue(tenantId, defectId));
}

export async function getDefectRawJiraIssue(tenantId: string, defectId: string): Promise<IDefectFromJiraRaw> {
    const jiraConfig = await getSetting<IJiraSettings>(tenantId, "jira");
    const url = `${await composeIssueUrl(tenantId, defectId)}?fields=${jiraConfig.neededFields.join(",")}`;
    const res = await axios.get(url, {auth: jiraConfig.credentials, validateStatus: status => status === 200 || status === 404});
    return res.status == 200 ? res.data : null;
}

export async function updateDefect(tenantId: string, defectId:string , fields: {[key: string]: unknown}): Promise<void> {
    log.info(`updating jira issue ${defectId}: ${JSON.stringify(fields)}`);
    const jiraConfig = await getSetting<IJiraSettings>(tenantId, "jira");
    const url = await composeIssueUrl(tenantId, defectId);
    await axios.put(url, {fields: fields}, {auth: jiraConfig.credentials});
}