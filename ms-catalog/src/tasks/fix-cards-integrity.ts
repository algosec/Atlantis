import log from '../../../shared/src/utils/log';
import {transaction} from '../../../shared/src/services/db';
import {areEquivalentCards} from '../services/are-equivalent-cards';
import {calculateCardsBranch} from './calculate-card-branch';
import {map} from 'p-iteration';
import {PoolConnection, ResultSetHeader, RowDataPacket} from "mysql2/promise";
import {ICardBasic} from "../../../shared/src/model";

function findEquivalentCard(cardId, allCardsById) {
    const card = allCardsById[cardId];
    let otherCard = card;

    while (otherCard.previousCard) {
        const nextCard = allCardsById[otherCard.previousCard];
        if (!areEquivalentCards(card, nextCard)) {
            break;
        }
        otherCard = nextCard;
    }

    return (card.id !== otherCard.id) ? otherCard.id : null
}

async function setPreviousCard(tenantId: string, dbConnection: PoolConnection) {
    log.info('Setting previous card...');

    // update for each card, its previous card. to do that need to create a temporary table
    await dbConnection.query(`CREATE TABLE cards_temp_${tenantId} SELECT * FROM cards WHERE tenantId = ?`, [tenantId]);
    const [res] = await dbConnection.query<ResultSetHeader>(`update cards c set c.previousCard = (select id from cards_temp ct where ct.tenantId = ? and ct.channel = c.channel and ct.title = c.title and ct.branch = c.branch and ct.created < c.created order by ct.created desc limit 1) where tenantId = ?`, [tenantId, tenantId]);
    await dbConnection.query(`DROP TABLE cards_temp_${tenantId};`);
    log.info(`${res.affectedRows} were updated`);
}

async function setOldestEquivalentCard(tenantId: string, dbConnection) {
    log.info('Setting oldest equivalent card...');

    // fetch information
    const [cards] = await dbConnection.query('select id, channel, title, branch, passed, skipped, failed, reviewed, previousCard from cards where tenantId = ? order by created', [tenantId]);
    const allCardsById = Object.fromEntries(cards.map(c => [c.id, c]));

    let countNoEquivalent = 0, countWithEquivalent = 0;
    const oldestEquivalentCardsShouldMarkAsReviewed = new Map();

    await map(Object.keys(allCardsById), async cardId => {
        const equivalentCardId = findEquivalentCard(cardId, allCardsById);
        if (equivalentCardId) {
            countWithEquivalent++;
            if (allCardsById[cardId].reviewed && !allCardsById[equivalentCardId].reviewed) {
                oldestEquivalentCardsShouldMarkAsReviewed.set(equivalentCardId, cardId);
            }
        } else {
            countNoEquivalent++;
        }
        await dbConnection.query('update cards set oldestEquivalentCard = ? where tenantId = ? and id = ?', [equivalentCardId, tenantId, cardId]);
    });

    await map(Array.from(oldestEquivalentCardsShouldMarkAsReviewed.keys()), async cardId => {
        const otherCard = allCardsById[oldestEquivalentCardsShouldMarkAsReviewed.get(cardId)];
        await dbConnection.query('update cards set reviewed = ?, reviewedBy = ? where tenantId = ? and id = ?', [otherCard.reviewed, otherCard.reviewedBy, tenantId, cardId]);
    });

    log.info(`${countWithEquivalent} cards with equivalent cards, ${countNoEquivalent} cards with no equivalent cards`);
    log.info(`${oldestEquivalentCardsShouldMarkAsReviewed.size} oldest equivalent cards should be marked as reviewed`);
}

async function populateBranchesAndMatchCards(tenantId: string, dbConnection: PoolConnection) {
    // step 1
    log.info('Populating branches table...');
    const [exitingBranches] = await dbConnection.query<RowDataPacket[]>(`select * from branches where tenantId = ?`, [tenantId]);
    const [rows] = await dbConnection.query<RowDataPacket[]>(`select distinct(REGEXP_REPLACE(cards.build, '\\\\.\\\\d+$', '')) as buildPrefix, cards.runMode, channels.team from cards join channels on cards.channel = channels.id where cards.tenantId = ? and (cards.runMode != 'master' or cards.build REGEXP '^\\\\d+\\\\.\\\\d+\\\\.0\\\\.\\\\d+$');`, [tenantId]);
    const rowsToUpdate = rows
        .filter(row => !exitingBranches.some(b => b.team === row.team && b.identifiers.includes(row.runMode)))
        .map(row => [tenantId, row.team, row.runMode, JSON.stringify([row.runMode])]);

    if (rowsToUpdate.length > 0) {
        await dbConnection.query('INSERT INTO branches (tenantId, team, title, identifiers) VALUES ? ON DUPLICATE KEY UPDATE tenantId = VALUES(tenantId), team = VALUES(team), title = VALUES(title), identifiers = VALUES(identifiers);', [rowsToUpdate]);
        log.info(`${rowsToUpdate.length} branches were created`);
    } else {
        log.info(`No branches were created`);
    }

    // step 2
    log.info('Matching cards to branches...');
    const [cards] = await dbConnection.query<(ICardBasic & RowDataPacket)[]>('select cards.id, cards.build, cards.runMode, cards.branch, channels.team from cards JOIN channels on channels.id = cards.channel where cards.tenantId = ?', [tenantId]);
    const cardToBranch1 = await calculateCardsBranch(tenantId, cards, dbConnection);
    const cardToBranch = Object.fromEntries(Object.entries(cardToBranch1).map(([k, v]) => [k, v.id]));

    const cardsToUpdate = cards.filter(c => c.branch !== cardToBranch[c.id]);
    await map(cardsToUpdate, async (card: ICardBasic) => {
        if (!cardToBranch[card.id]) {
            throw new Error(`card '${card.id}' with build '${card.build}' and runMode '${card.runMode}' could not be matched to a branch`);
        }
        await dbConnection.query('update cards set branch = ? where tenantId = ? and id = ?', [cardToBranch[card.id], tenantId, card.id]);
    });

    log.info(`${cardsToUpdate.length} cards were updated with corresponding branch`);
}

async function executeSync(tenantId: string, dbConnection: PoolConnection) {
    log.info('Starting to fix cards integrity');

    await populateBranchesAndMatchCards(tenantId, dbConnection);
    await setPreviousCard(tenantId, dbConnection);
    await setOldestEquivalentCard(tenantId, dbConnection); // must be after setPreviousCard as it uses the information that was calculated there

    log.info('Finished to fix cards integrity');
}

export async function fixCardsIntegrity(tenantId: string): Promise<void>  {
  await transaction(async (dbConnection: PoolConnection) => await executeSync(tenantId, dbConnection));
}