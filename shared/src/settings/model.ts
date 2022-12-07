

export interface IFeatureBranchSetting {
    url: string;
    user: string;
    pass: string;
}

export type EmailList = string[];

export interface IJiraSettings {
    baseUrl: string;
    maxBulk: number,
        credentials: {
            username: string,
            password: string
    };
    fields: {
        failingAutomationField: string,
        failingTestCaseNameField: string
    };
    jql: string;
    neededFields: string[];
}

export interface IJenkinsSettings {
    baseUrl: string;
}