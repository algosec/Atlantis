import {ICard} from "../../../shared/src/model";

function getBranchId(branch) {
    // it can be either the branch object or the branch id
    return branch.id || branch;
}

export function areEquivalentCards(card1: ICard, card2: ICard): boolean {
    return card1.channel === card2.channel
        && card1.title === card2.title
        && getBranchId(card1.branch) === getBranchId(card2.branch)
        && card1.passed === card2.passed
        && card1.skipped === card2.skipped
        && card1.failed === card2.failed
    ;
}