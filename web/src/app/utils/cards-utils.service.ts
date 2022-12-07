import {Injectable} from '@angular/core';
import {CardStatus, ICard} from "../../../../shared/src/model";

@Injectable({
  providedIn: 'root'
})
export class CardsUtilsService {

  isStabilization(card: ICard): boolean {
    return card.title.endsWith("-STABILIZATION");
  }

  calculateCardStatus(card: ICard): CardStatus {
    if (card.failed === 0) {
      return CardStatus.PASS;
    } else if (card.reviewed) {
      return CardStatus.REVIEWED;
    } else if (card.oldestEquivalentCard?.reviewed) {
      return CardStatus.SAME_STATUS;
    } else {
      return CardStatus.PENDING;
    }
  }
}
