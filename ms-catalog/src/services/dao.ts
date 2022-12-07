import {query} from '../../../shared/src/services/db';
import * as moment from 'moment';
import {ResultSetHeader, RowDataPacket} from "mysql2/promise";
import { v4 as uuidv4 } from 'uuid';
import {
    IBranch,
    IBranchExtendedSummary,
    IBranchOwners, IBuildsByBranch,
    IBuildsByBranchByTeam,
    IBuildTrendItem,
    ICard, ICardBuildSummary, ICardFlat, IChannelAndVersion,
    IChannelExtendedSummary, IChannelLatestSummary, IChannelSetupInfo, IChannelsOwners, IChannelToDefect,
    IDefect, ITeam,
    IBuildCountByChannel
} from "../../../shared/src/model";

const SELECT_CARDS_PREFIX_GENERATOR = (table) => `SELECT c.*, JSON_OBJECT('id', b.id, 'title', b.title, 'identifiers', b.identifiers) as branch, IF(pc.passed IS NULL, NULL, JSON_OBJECT('passed', pc.passed, 'skipped', pc.skipped, 'failed', pc.failed)) as previousCard, IF(ec.created IS NULL, NULL, JSON_OBJECT('created', ec.created, 'reviewed', ec.reviewed, 'reviewedBy', ec.reviewedBy, 'reviewedWithBypass', ec.reviewedWithBypass)) as oldestEquivalentCard, ee.webUrl as webUrl from ${table} c LEFT JOIN branches b ON c.branch = b.id LEFT JOIN cards ec ON c.oldestEquivalentCard = ec.id LEFT JOIN cards pc ON c.previousCard = pc.id LEFT JOIN external_entity ee ON c.externalEntity = ee.id`;

export async function getTeamByVersion(tenantId: string, version: string): Promise<ITeam> {
    const [rows] = await query<(ITeam & RowDataPacket)[]>('SELECT * FROM teams where tenantId = ? and version = ? LIMIT 1', [tenantId, version]);
    return rows.length > 0 ? rows[0] : null;
}

export async function getChannelIdByTeamAndName(tenantId: string, teamId: string, channelTitle: string): Promise<string> {
    const [rows] = await query<RowDataPacket[]>('SELECT id FROM channels where tenantId = ? and team = ? and title = ? LIMIT 1', [tenantId, teamId, channelTitle]);
    return rows.length > 0 ? rows[0].id : null;
}

export async function insertNewChannel(tenantId: string, teamId: string, title: string): Promise<string> {
    const id = uuidv4();
    await query<ResultSetHeader>('INSERT INTO channels (id, tenantId, team, title) VALUES ?', [[[
        id,
        tenantId,
        teamId,
        title
    ]]]);
    return id;
}

export async function updateChannelWithExternalEntity(tenantId: string, id: string, idExternal: string): Promise<void> {
    await query<ResultSetHeader>('UPDATE channels SET externalEntity = ? where tenantId = ? and id = ?', [idExternal, tenantId, id]);
}

export async function updateCardWithExternalEntity(tenantId: string, id: string, idExternal: string): Promise<void> {
    await query<ResultSetHeader>('UPDATE cards SET externalEntity = ? WHERE tenantId = ? AND id = ?', [
        idExternal,
        tenantId,
        id
    ]);
}

export async function insertExternalEntity(tenantId: string, id: string, idExternal: string, webUrl: string): Promise<void> {
    await query<ResultSetHeader>('INSERT INTO external_entity (id, tenantId, idExternal, webUrl) VALUES ?', [[[
        id,
        tenantId,
        idExternal,
        webUrl
    ]]]);
}

export interface ICardCreate extends ICardFlat {
    team: string;
    targetChannelTitle: string;
    version: string;
}
export async function insertNewCard(tenantId: string, cardData: ICardCreate): Promise<string> {
    const id = uuidv4();
    await query<ResultSetHeader>('INSERT INTO cards (id, tenantId, channel, title, url, build, runMode, branch, passed, skipped, failed, metaData, previousCard, oldestEquivalentCard) VALUES ?', [[[
        id,
        tenantId,
        cardData.channel,
        cardData.title,
        cardData.url,
        cardData.build,
        cardData.runMode,
        cardData.branch.id,
        cardData.passed,
        cardData.skipped,
        cardData.failed,
        JSON.stringify(cardData.metaData),
        cardData.previousCard,
        cardData.oldestEquivalentCard,
    ]]]);

    // pass card should be marked as reviewed
    if (cardData.failed === 0) {
        await query<ResultSetHeader>('update cards set reviewed = created where tenantId = ? and id = ?', [tenantId, id]);
    }

    return id;
}

export async function markCardAsReviewed(tenantId: string, cardId: string, oldestEquivalentCard: string, wasBypassUsed: boolean, reviewerEmail: string): Promise<boolean> {
    const [res] = await query<ResultSetHeader>('UPDATE cards SET reviewed = NOW(), reviewedBy = ?, reviewedWithBypass = ? WHERE tenantId = ? AND (id = ? OR (id = ? AND reviewed IS NULL))', [reviewerEmail, wasBypassUsed, tenantId, cardId, oldestEquivalentCard])
    return res.affectedRows > 0;
}

export async function getChannelsOwners(tenantId: string, version: string): Promise<IChannelsOwners[]> {
    const [res] = await query<(IChannelsOwners & RowDataPacket)[]>('select channels.id, channels.title, channels.owner from channels LEFT JOIN teams ON channels.team = teams.id WHERE channels.tenantId = ? AND teams.version = ? ORDER BY channels.owner', [tenantId, version]);
    return res;
}

export async function setChannelsOwners(tenantId: string, channels: string[], newOwnerEmail: string): Promise<void> {
    await query<ResultSetHeader>('UPDATE channels SET owner = ? WHERE tenantId = ? AND id IN ?', [newOwnerEmail, tenantId, [channels]]);
}
export async function setBranchesOwners(tenantId: string, branches: string[], newOwnerEmail: string): Promise<void> {
    await query<ResultSetHeader>('UPDATE branches SET owner = ? WHERE tenantId = ? AND id IN ?', [newOwnerEmail, tenantId, [branches]]);
}

export async function setBranchTitle(tenantId: string, branch: string, newTitle: string): Promise<void> {
    await query<ResultSetHeader>('UPDATE branches SET title = ? WHERE tenantId = ? AND id = ?', [newTitle, tenantId, branch]);
}

export async function setBranchArchived(tenantId: string, branch: string, archived: boolean): Promise<void> {
    await query<ResultSetHeader>('UPDATE branches SET archived = ? WHERE tenantId = ? AND id = ?', [archived, tenantId, branch]);
}

export async function setChannelArchived(tenantId: string, channel: string, archived: boolean): Promise<void> {
    await query<ResultSetHeader>('UPDATE channels SET archived = ? WHERE tenantId = ? AND id = ?', [archived, tenantId, channel]);
}

export async function getTeams(tenantId: string): Promise<ITeam[]> {
    const [teams] = await query<(ITeam & RowDataPacket)[]>('SELECT * FROM teams WHERE tenantId = ? ORDER BY `order` DESC', [tenantId]);
    const [allBranches] = await query<(IBranch & RowDataPacket)[]>('SELECT * from branches where tenantId = ? AND id in (select distinct(branch) from cards) and archived = false order by title', [tenantId]);

    // inject feature branches names
    teams.forEach(row => row.branches = []);
    allBranches.forEach(row => teams.filter(team => team.id === row.team).forEach(team => team.branches.push(row)));

    return teams;
}


export async function getChannelsLatestSummary(tenantId: string, teamId: string, branch: number): Promise<IChannelLatestSummary[]> {
    // get latest cards and group by channel
    const [latestCards] = await query<RowDataPacket[]>(`${SELECT_CARDS_PREFIX_GENERATOR('latest_cards')} WHERE c.tenantId = ? AND c.channel in (SELECT id FROM channels WHERE team = ?) AND c.branch = ?`, [tenantId, teamId, branch]);
    const latestCardsByChannel = Object.fromEntries(latestCards.map(e => [e.channel, e]));

    // get last reviewed cards and group by channel
    const [latestReviewedCards] = await query<RowDataPacket[]>(`select c.channel, c.reviewed from latest_reviewed_cards c WHERE c.tenantId = ? AND c.channel IN (SELECT id FROM channels WHERE team = ?) AND c.branch = ?`, [tenantId, teamId, branch]);
    const lastReviewDateChannel = Object.fromEntries(latestReviewedCards.map(e => [e.channel, e.reviewed]));

    // get all relevant defects and group by channel
    const [relevantDefects] = await query<RowDataPacket[]>(`SELECT defects.*, channels_defects.channel FROM defects JOIN channels_defects ON channels_defects.defect = defects.id where defects.tenantId = ? and defects.status != ? and defects.status != ? and channels_defects.channel in (SELECT id FROM channels WHERE team = ?)`, [tenantId, 'Closed',  'Resolved', teamId]);
    const defectsByChannel = relevantDefects.reduce((m, defect) => {
        if (!m[defect.channel]) {
            m[defect.channel] = [];
        }
        const list = m[defect.channel];
        delete defect.channel;
        list.push(defect);
        return m;
    }, {});

    // load all channels (that are not archived) + inject additional information
    let [rows] = await query<(IChannelLatestSummary & RowDataPacket)[]>('SELECT * FROM channels where tenantId = ? and team = ? and archived = false ORDER BY title', [tenantId, teamId]);
    rows.forEach(row => row.latestCard = latestCardsByChannel[row.id]);
    rows.forEach(row => row.lastReviewed = lastReviewDateChannel[row.id]);
    rows.forEach(row => row.defects = defectsByChannel[row.id] || []);

    // filter out channels with no latest card
    rows = rows.filter(row => row.latestCard);

    // put stabilization channels last
    const regularChannels = rows.filter(r => !r.latestCard.title.endsWith("-STABILIZATION"));
    const stabilizationChannels = rows.filter(r => r.latestCard.title.endsWith("-STABILIZATION"));

    return [...regularChannels, ...stabilizationChannels];
}

export async function getChannelsConfiguration(tenantId: string, version: string): Promise<IChannelSetupInfo[]> {
    // get latest cards and group by channel (there might be few cards per channel, so order in ASC, so the grouping will take the latest card)
    const [latestCards] = await query<RowDataPacket[]>(`SELECT * FROM latest_cards WHERE tenantId = ? AND channel IN (SELECT channels.id FROM channels JOIN teams ON channels.team = teams.id WHERE channels.tenantId = ? AND teams.version = ?) ORDER BY created ASC`, [tenantId, tenantId, version]);
    const latestCardsByChannel = Object.fromEntries(latestCards.map(e => [e.channel, e]));

    const [channelToNumberOfCards] = await query<RowDataPacket[]>(`SELECT channel, count(*) AS cardsCount FROM cards WHERE tenantId = ? AND channel IN (SELECT channels.id FROM channels JOIN teams ON channels.team = teams.id WHERE channels.tenantId = ? AND teams.version = ?) GROUP BY channel`, [tenantId, tenantId, version]);
    const cardsCountPerChannel = Object.fromEntries(channelToNumberOfCards.map(e => [e.channel, e.cardsCount]));

    // inject to response
    const [rows] = await query<(IChannelSetupInfo & RowDataPacket)[]>('SELECT channels.* FROM channels JOIN teams ON channels.team = teams.id WHERE channels.tenantId = ? AND teams.version = ? ORDER BY channels.title', [tenantId, version]);
    rows.forEach(row => row.latestCardTime = latestCardsByChannel[row.id] && latestCardsByChannel[row.id].created || null);
    rows.forEach(row => row.cardsCount = cardsCountPerChannel[row.id] || 0);

    // sort by last activity
    const rowsWithActivity = rows.filter(r => r.latestCardTime);
    const rowsWithoutActivity = rows.filter(r => !r.latestCardTime);
    rowsWithActivity.sort((a,b) => moment(a.latestCardTime).valueOf() - moment(b.latestCardTime).valueOf());

    return [...rowsWithoutActivity, ...rowsWithActivity];
}

export async function getDefectsByChannel(tenantId: string, channelId: string): Promise<IDefect[]> {
    const [rows] = await query<(IDefect & RowDataPacket)[]>('SELECT defects.* FROM defects JOIN channels_defects ON channels_defects.defect = defects.id where defects.tenantId = ? and channels_defects.channel = ?', [tenantId, channelId]);
    return rows;
}

export async function getDefects(tenantId: string, version:string): Promise<IDefect[]> {
    //get all relevant channels and group by defect
    const [relevantChannels] = await query<RowDataPacket[]>(`SELECT channels.*, channels_defects.defect as defect FROM defects 
        LEFT JOIN channels_defects ON defects.id = channels_defects.defect
        LEFT JOIN channels ON channels_defects.channel = channels.id
        WHERE defects.tenantId = ? AND channels.team IN (SELECT teams.id FROM teams WHERE teams.tenantId = ? AND teams.version = ?)`, [tenantId, tenantId, version]);
    const channelsByDefect = relevantChannels.reduce((res, channel) => {
        if (!res[channel.defect]) {
            res[channel.defect] = [];
        }
        const list = res[channel.defect];
        delete channel.defect;
        list.push(channel);
        return res;
    }, {});

    // load all defects for version
    let [rows] = await query<(IDefect & RowDataPacket)[]>(`SELECT defects.* FROM defects 
            LEFT JOIN channels_defects ON defects.id = channels_defects.defect 
            LEFT JOIN channels ON channels_defects.channel = channels.id
            WHERE defects.tenantId = ? AND defects.status != ? AND defects.status != ? AND channels.team IN (SELECT teams.id FROM teams WHERE teams.tenantId = ? AND teams.version = ?)
            ORDER BY id ASC`, [tenantId, 'Closed', 'Resolved', tenantId, version]);
    rows = rows.reduce((res, val) => {
            for (const i in res) {
                if (res[i].id === val.id) {
                    return res;
                }
            }
            res.push(val);
            return res;
        }, []);

    rows.forEach(row => row.channels = channelsByDefect[row.id] || []);

    return [...rows];
}

export async function getDefectsByChannels(tenantId: string, version: string): Promise<IChannelToDefect> {
    // get all relevant defects and group by channel
    const [relevantDefects] = await query<(IDefect & RowDataPacket)[]>(`SELECT defects.*, channels_defects.channel FROM defects JOIN channels_defects ON channels_defects.defect = defects.id where defects.tenantId = ? and defects.status != ? and defects.status != ? and channels_defects.channel in (SELECT channels.id FROM channels LEFT JOIN teams ON channels.team = teams.id WHERE teams.version = ?)`, [tenantId, 'Closed', 'Resolved', version]);
    return relevantDefects.reduce((m, defect) => {
        if (!m[defect.channel]) {
            m[defect.channel] = [];
        }
        const list = m[defect.channel];
        delete defect.channel;
        list.push(defect);
        return m;
    }, {});
}

export async function getOrphanDefects(tenantId: string): Promise<IDefect[]> {
    const [rows] = await query<(IDefect & RowDataPacket)[]>('SELECT * FROM defects WHERE tenantId = ? AND id NOT IN (SELECT DISTINCT(defect) FROM channels_defects) ORDER by lastUpdate DESC', [tenantId]);
    return rows;
}

export async function getCardsByChannel(tenantId: string, channelId: string): Promise<ICard[]> {
    const [rows] = await query<(ICard & RowDataPacket)[]>(`${SELECT_CARDS_PREFIX_GENERATOR('cards')} WHERE c.tenantId = ? and c.channel = ? ORDER BY c.created DESC`, [tenantId, channelId]);
    return rows;
}

export async function getChannelById(tenantId: string, channelId: string): Promise<IChannelAndVersion> {
    const [rows] = await query<(IChannelAndVersion & RowDataPacket)[]>('SELECT channels.*, teams.version from channels LEFT JOIN teams ON teams.id = channels.team WHERE channels.tenantId = ? AND channels.id = ?', [tenantId, channelId]);
    return (rows.length > 0) ? rows[0] : null;
}

export async function getChannel(tenantId: string, version: string, channelTitle: string): Promise<IChannelExtendedSummary> {
    const [rows] = await query<(IChannelExtendedSummary & RowDataPacket)[]>('SELECT channels.*, teams.version, ee.webUrl FROM channels LEFT JOIN teams ON channels.team = teams.id LEFT JOIN external_entity ee ON channels.externalEntity = ee.id where channels.tenantId = ? AND teams.version = ? AND channels.title = ?', [tenantId, version, channelTitle]);
    if (rows.length === 0) {
        return null;
    }
    const row: IChannelExtendedSummary = rows[0];
    row.defects = await getDefectsByChannel(tenantId, row.id);
    row.cards = await getCardsByChannel(tenantId, row.id);
    row.branches = await getBranches(tenantId, row.team);
    return row;
}

export async function getCardByExternalId(tenantId: string, externalId: string): Promise<ICardFlat> {
    const [rows] = await query<(ICardFlat & RowDataPacket)[]>('select cards.* from cards left join external_entity ee on cards.externalEntity = ee.id where cards.tenantId = ? and ee.idExternal = ?', [tenantId, externalId]);
    if (rows.length === 0) {
        return null;
    }
    return rows[0];
}

export async function isLatestCard(tenantId: string, cardId: string): Promise<boolean> {
    const [rows] = await query<RowDataPacket[]>('select id FROM latest_cards WHERE tenantId = ? AND id = ?', [tenantId, cardId]);
    return (rows.length > 0);
}

export async function getDefectsIdsByChannel(tenantId: string, channelId: string): Promise<string[]> {
    const [rows] = await query<RowDataPacket[]>('select defect from channels_defects where tenantId = ? and channel = ?', [tenantId, channelId]);
    return rows.map(x => x.defect);
}

export async function isDefectLinkedToChannel(tenantId: string, channelId: string, defectId: string): Promise<boolean> {
    const [rows] = await query<RowDataPacket[]>('select defect from channels_defects where tenantId = ? and channel = ? and defect = ? ', [tenantId, channelId, defectId]);
    return rows.length > 0;
}

export async function getLatestCard(tenantId: string, channel: string, title: string, branch: number): Promise<ICard> {
    const [rows] = await query<(ICard & RowDataPacket)[]>('select * from latest_cards lc where lc.tenantId = ? and lc.channel = ? and lc.title = ? and lc.branch = ?', [tenantId, channel, title, branch]);
    if (rows.length === 0) {
        return null;
    }
    return rows[0];
}

export async function getCardsByBranchAndBuild(tenantId: string, branch: string, build: string): Promise<ICardBuildSummary[]> {
    const [rows] = await query<(ICardBuildSummary & RowDataPacket)[]>(`WITH latest_build_cards AS (SELECT cards.*, channels.title as channelTitle FROM cards 
        JOIN channels
            ON channels.id = cards.channel
        INNER JOIN (SELECT cards.channel, cards.branch, max(cards.created) as lastCreated FROM cards LEFT JOIN branches ON branches.id = cards.branch WHERE branches.title = ? AND cards.build = ? GROUP BY cards.channel, cards.branch) as temp
            ON cards.channel = temp.channel and cards.branch= temp.branch and cards.created = temp.lastCreated
        WHERE cards.tenantId = ? AND channels.archived = false)
                        ${SELECT_CARDS_PREFIX_GENERATOR('latest_build_cards')}`, [branch, build, tenantId]);
    return rows;
}

export async function getBuildsByBranchByTeam(tenantId: string): Promise<IBuildsByBranchByTeam[]> {
    const [teams] = await query<(IBuildsByBranchByTeam & RowDataPacket)[]>('SELECT id, version FROM teams WHERE tenantId = ? ORDER BY `order` DESC', [tenantId]);
    const [branches] = await query<(IBuildsByBranch & RowDataPacket)[]>('SELECT id, title, team from branches where tenantId = ? and archived = false order by id', [tenantId]);
    const [builds] = await query<RowDataPacket[]>('SELECT DISTINCT(build), branch, min(created) as firstCard from cards WHERE tenantId = ? GROUP BY build, branch ORDER BY firstCard DESC;', [tenantId]);
    const teamsById = Object.fromEntries(teams.map(e => [e.id, e]));
    const branchesById = Object.fromEntries(branches.map(e => [e.id, e]));

    // inject builds
    branches.forEach(row => row.builds = []);
    builds
        .filter(row => branchesById[row.branch]) // filter out builds that their branch is archived
        .forEach(row => branchesById[row.branch].builds.push(row.build));

    // inject branches (that has builds) to teams
    teams.forEach(row => row.branches = []);
    branches.filter(row => row.builds.length > 0) // remove branches without builds
        .forEach(row => {
        teamsById[row.team].branches.push(row);
        delete row.team;
    });

    // remove teams without branches
    return teams.filter(row => row.branches.length > 0);
}

export async function areCardsExistInBuild(tenantId: string, build: string): Promise<boolean> {
    const [rows] = await query<RowDataPacket[]>('select id from cards where tenantId = ? and build = ? limit 1', [tenantId, build]);
    return (rows.length > 0);
}

export async function getBranchTrend(tenantId: string, branchId: number): Promise<IBuildTrendItem[]> {
    const [builds] = await query<(IBuildTrendItem & RowDataPacket)[]>(`
        SELECT cards.build, channels.title, min(cards.created) as firstCard, sum(cards.passed) as passed, sum(cards.failed) as failed, sum(cards.skipped) as skipped FROM cards
            INNER JOIN (SELECT cards.channel, cards.build, max(cards.created) as lastCreated FROM cards WHERE tenantId = ? AND branch = ? GROUP BY cards.channel, cards.build) as temp
                ON cards.channel = temp.channel and cards.build = temp.build and cards.created = temp.lastCreated
            LEFT JOIN channels ON channels.id = cards.channel
        WHERE
            cards.tenantId = ? 
        group by cards.build, cards.channel order by firstCard`, [tenantId, branchId, tenantId]);
    builds.forEach(b => {
        b.passed = Number(b.passed);
        b.skipped = Number(b.skipped);
        b.failed = Number(b.failed);
    });

    return builds;
}

export async function getBranchesConfiguration(tenantId: string, version: string): Promise<IBranchExtendedSummary[]> {
    // get latest cards and group by channel (there might be few cards per channel, so order in ASC, so the grouping will take the latest card)
    const [latestCards] = await query<RowDataPacket[]>(`SELECT * FROM latest_cards WHERE tenantId = ? AND channel IN (SELECT channels.id FROM channels JOIN teams ON channels.team = teams.id WHERE channels.tenantId = ? AND teams.version = ?) ORDER BY created ASC`, [tenantId, tenantId, version]);
    const latestCardsByBranch = Object.fromEntries(latestCards.map(e => [e.branch, e]));

    const [branchToNumberOfCards] = await query<RowDataPacket[]>(`SELECT branch, count(*) AS cardsCount FROM cards WHERE tenantId = ? AND branch IN (SELECT branches.id FROM branches JOIN teams ON branches.team = teams.id WHERE branches.tenantId = ? AND teams.version = ?) GROUP BY branch`, [tenantId, tenantId, version]);
    const cardsCountPerBranch = Object.fromEntries(branchToNumberOfCards.map(e => [e.branch, e.cardsCount]));

    // inject to response
    const [rows] = await query<(IBranchExtendedSummary & RowDataPacket)[]>('select branches.* from branches JOIN teams ON branches.team = teams.id WHERE branches.tenantId = ? AND teams.version = ? ORDER BY branches.id', [tenantId, version]);
    rows.forEach(row => row.latestCardTime = latestCardsByBranch[row.id] && latestCardsByBranch[row.id].created || null);
    rows.forEach(row => row.cardsCount = cardsCountPerBranch[row.id] || 0);

    // sort by last activity
    const rowsWithActivity = rows.filter(r => r.latestCardTime);
    const rowsWithoutActivity = rows.filter(r => !r.latestCardTime);
    rowsWithActivity.sort((a,b) => moment(a.latestCardTime).valueOf() - moment(b.latestCardTime).valueOf());

    return [...rowsWithoutActivity, ...rowsWithActivity];
}

export async function getBranchesOwners(tenantId: string): Promise<IBranchOwners[]> {
    const [branchToNumberOfCards] = await query<RowDataPacket[]>(`SELECT branch, count(*) AS cardsCount FROM cards WHERE tenantId = ? GROUP BY branch`, [tenantId]);
    const cardsCountPerBranch = Object.fromEntries(branchToNumberOfCards.map(e => [e.branch, e.cardsCount]));

    // inject to response
    const [rows] = await query<(IBranchOwners & RowDataPacket)[]>('select branches.id, teams.version, branches.owner, branches.identifiers from branches JOIN teams ON branches.team = teams.id WHERE branches.tenantId = ? ORDER BY branches.id', [tenantId]);
    rows.forEach(row => row.isActive = ((cardsCountPerBranch[row.id] || 0) > 0));

    return rows;
}

export async function getBranches(tenantId: string, teamId: string): Promise<IBranch[]> {
    const [rows] = await query<(IBranch & RowDataPacket)[]>('select * from branches WHERE tenantId = ? AND team = ? ORDER BY branches.title', [tenantId, teamId]);
    return rows;
}

export interface IBranchCreate {
    team: string;
    title: string;
    identifiers: string[];
    jiraIssue?: string;
    gitBranch?: string;
}
export async function createBranch(tenantId: string, branch: IBranchCreate): Promise<void> {
    await query<ResultSetHeader>('INSERT INTO branches (tenantId, team, title, identifiers, jiraIssue, gitBranch) VALUES ?', [[[
        tenantId,
        branch.team,
        branch.title,
        JSON.stringify(branch.identifiers),
        branch.jiraIssue,
        branch.gitBranch
    ]]]);
}

export async function updateBranchIdentifiers(tenantId: string, branchId: string, identifiers: string[]): Promise<void> {
    await query<ResultSetHeader>('update branches set identifiers = ? where tenantId = ? and id = ?', [JSON.stringify(identifiers), tenantId, branchId]);
}


export interface ChannelExternalEntityInfo {channelTitle: string, channelExternalId: string, teamExternalId: string, garbageChannelExternalId: string}

export async function getChannelExternalEntityInfo(tenantId: string, id: string): Promise<ChannelExternalEntityInfo> {
    const [rows] = await query<(ChannelExternalEntityInfo & RowDataPacket)[]>(`SELECT channels.title as channelTitle, ee_c.idExternal as channelExternalId, ee_t.idExternal as teamExternalId, ee_g.idExternal as garbageChannelExternalId FROM channels
        LEFT JOIN external_entity ee_c ON channels.externalEntity = ee_c.id
        LEFT JOIN teams ON channels.team = teams.id
        LEFT JOIN external_entity ee_t ON teams.externalEntity = ee_t.id
        LEFT JOIN external_entity ee_g ON teams.garbageChannel = ee_g.id
        WHERE channels.tenantId = ? AND channels.id = ? LIMIT 1`, [tenantId, id]);
    return rows.length > 0 ? <ChannelExternalEntityInfo> rows[0] : null;
}

export async function getNumberOfRunsBuild(tenantId: string, build: string): Promise<IBuildCountByChannel[]> {
    const [builds] = await query<(IBuildCountByChannel & RowDataPacket)[]>('select channels.title, count(build) as runCount from cards join channels on cards.channel=channels.id where cards.tenantId = ? and build = ? group by channels.title order by count(build) desc', [tenantId, build]);
    return builds;
}
