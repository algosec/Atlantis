import {query} from '../../../shared/src/services/db';
import {getBranchPrefixFromBuild} from '../utils/build-parser';
import {PoolConnection, RowDataPacket} from "mysql2/promise";
import {IBranch, ICard, ICardBasic} from "../../../shared/src/model";

function isIdentifierMatchRunModeNoMaster(card, identifier) {
    return identifier !== 'master' && card.runMode === identifier;
}

function isIdentifierMatchBuild(card, identifier) {
    return card.build === identifier || getBranchPrefixFromBuild(card.build) === identifier;
}

function isIdentifierMatchRunModeIsMaster(card, identifier) {
    return identifier === 'master' && card.runMode === identifier;
}

function findCardBranch(card, branches: IBranch[]): IBranch {
    const teamBranches = branches.filter(b => b.team === card.team);

    // search by priority
    return teamBranches.find(b => b.identifiers.some(i => isIdentifierMatchRunModeNoMaster(card, i)))
        || teamBranches.find(b => b.identifiers.some(i => isIdentifierMatchBuild(card, i)))
        || teamBranches.find(b => b.identifiers.some(i => isIdentifierMatchRunModeIsMaster(card, i)));
}

export async function calculateCardsBranch(tenantId: string, cards: ICardBasic[], dbConnection: PoolConnection): Promise<{[cardId: string]: IBranch}> {
    const [branches] = await dbConnection.query<(IBranch & RowDataPacket)[]>('select * from branches where tenantId = ?', [tenantId]);
    return Object.fromEntries(cards.map(c => [
        c.id,
        findCardBranch(c, branches)
    ]));
}

export async function calculateCardBranch(tenantId: string, card: ICard): Promise<IBranch> {
    const [branches] = await query<(IBranch & RowDataPacket)[]>('select * from branches where tenantId = ?', [tenantId]);
    return findCardBranch(card, branches);
}