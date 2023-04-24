export interface ITeam {
    id: string;
    version: string;
    webUrl?: string;
    branches: IBranch[];
    allowedAutomationBranches: string[];
    mode: string;
    defaultBranch: string;
    buckets: IBucket[];
}

export interface IDefect {
    id: string;
    summary: string;
    issueType: IDefectType;
    status: string;
    assignee: string;
    rndTeam: string;
    created: Date;
    lastUpdate: Date;
    severity: string;
}

export interface IDefectFailures extends IDefect {
    channels: IChannel[];
}

export interface IChannelToDefect {
    [channelId: string]: IDefect[];
}

export type IDefectType = 'AutoBug' | 'Bug' | 'Support Bug';
export type IIcon = IDefectType | 'Teams' | 'Allure';

export interface IChannel {
    id: string;
    title: string;
    webUrl?: string;
    owner: string;
    jenkinsJob?: string;
    archived: boolean;
    team: string;
}

export interface IChannelAndVersion extends IChannel {
    version: string;
}

export interface IChannelLatestSummary extends IChannel {
    defects: IDefect[];
    latestCard: ICard;
    lastReviewed?: Date;
}

export interface IChannelExtendedSummary extends IChannel {
    version: string;
    cards: ICard[];
    defects: IDefect[];
    branches: IBranch[];
}

export interface IChannelSetupInfo extends IChannel {
    cardsCount: number;
    latestCardTime?: Date;
    owner: string;
}

export enum CardStatus {
    PASS = 'PASS',
    SAME_STATUS = 'SAME_STATUS',
    REVIEWED = 'REVIEWED',
    PENDING = 'PENDING',
}

export interface ICardBasic {
    id: string;
    channel: string;
    title: string;
    url: string
    build: string;
    passed: number;
    skipped: number;
    failed: number;
    created: Date;
    reviewed: Date;
    reviewedBy?: string; // TODO: make this mandatory
    reviewedWithBypass: boolean;
    webUrl?: string;
    runMode?: string;
    metaData: {
        automationBranch: string;

        // additional arbitrary data
        [key: string]: string
    }
}

export interface ICardFlat extends ICardBasic {
    branch: {
        id: string;
    };
    previousCard: string;
    oldestEquivalentCard: string;
}

export interface ICard extends ICardBasic {
    branch: IBranch;
    previousCard?: {
        passed: number;
        skipped: number;
        failed: number;
    }
    oldestEquivalentCard?: {
        created: Date;
        reviewed?: Date;
        reviewedBy?: string;
        reviewedWithBypass?: boolean;
    }
}

export interface ICardBuildSummary extends ICard {
    channelTitle: string;
}

export interface IChannelsPageSearch {
    text: string;
    bucket: string;
    passedOnly: boolean;
    failuresOnly: boolean;
    pendingOnly: boolean;
    reviewedOnly: boolean;
    sameStatusOnly: boolean;
    favoritesOnly: boolean;
}

export interface IBranch {
    id: number;
    team: string;
    title: string;
    owner: string;
    identifiers: string[];
    archived: boolean;
    gitBranch?: string;
    jiraIssue?: string;
}

export interface IBranchExtendedSummary extends IBranch {
    latestCardTime?: Date;
    cardsCount: number;
}

export interface IBuildsByBranchByTeam {
    id: string;
    version: string;
    branches: IBuildsByBranch[];
}

export interface IBuildCountByChannel {
    title: string;
    runCount: number;
}

export interface IBuildsByBranch {
    id: number;
    title: string;
    builds: string[];
}

export interface IBuildTrendItem {
    build: string
    title: string;
    firstCard: Date;
    failed: number
    passed: number;
    skipped: number;
}

export interface DefaultRestResponse {
    status: string;
    message: string;
}

export interface IBranchOwners {
    id: string;
    version: string;
    owner: string;
    identifiers: string[];
    isActive: boolean;
}

export interface IChannelsOwners {
    id: string;
    title: string;
    owner: string;
}
export interface IBucket {
    title: string;
    prefix: string[]
    suffix: string[]
}