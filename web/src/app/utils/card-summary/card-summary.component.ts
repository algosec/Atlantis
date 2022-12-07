import {Component, Input} from '@angular/core';
import {CardStatus, ICard} from "../../../../../shared/src/model";
import {DateTimeService} from "../date-time.service";
import {EmailToDisplayNamePipe} from "../email-to-display-name.pipe";
import {CardsUtilsService} from "../cards-utils.service";

@Component({
  selector: 'card-summary',
  templateUrl: './card-summary.component.html',
  styleUrls: ['./card-summary.component.css']
})
export class CardSummaryComponent {

  @Input() card: ICard;
  @Input() showLastReviewedIcon: boolean;
  @Input() showDateColor: boolean;
  @Input() lastReviewed?: Date;

  constructor(public dateTimeService: DateTimeService,
              private emailToDisplayNamePipe : EmailToDisplayNamePipe,
              public cardsUtilsService: CardsUtilsService) { }

  // workaround for enum to be accessible in component's html
  public get CardStatus(): typeof CardStatus {
    return CardStatus;
  }

  buildCardDescription(card: ICard): string {
    const parts = [
      `Build: ${card.build}`
    ];

    if (card.metaData.applianceBuild) {
      parts.push(`appliance: ${card.metaData.applianceBuild}`);
    }

    return parts.join(" ; ");
  }

  calculateLinkToCardTitle(card: ICard): string {
    const parts = [];

    if (card.failed == 0) {
      // do nothing
    } else if (card.reviewed) {
      const resolvedBySuffix = card.reviewedBy ? ` by ${this.emailToDisplayNamePipe.transform(card.reviewedBy)}` : '';
      parts.push(`Reviewed after ${this.dateTimeService.getDurationBetween(card.reviewed, card.created)}${resolvedBySuffix}`);
    } else if (card.oldestEquivalentCard && card.oldestEquivalentCard.reviewed) {
      parts.push(`Equivalent card created ${this.dateTimeService.getTimeDiffAndFull(card.oldestEquivalentCard.created)}`);
      const resolvedBySuffix = card.oldestEquivalentCard.reviewedBy ? ` by ${this.emailToDisplayNamePipe.transform(card.oldestEquivalentCard.reviewedBy)}` : '';
      parts.push(`Equivalent card reviewed after ${this.dateTimeService.getDurationBetween(card.oldestEquivalentCard.reviewed, card.oldestEquivalentCard.created)}${resolvedBySuffix}`);
    } else {
      parts.push(`Pending since ${this.dateTimeService.getTimeDiff(card.created)}`);
    }

    return parts.join("\n");
  }

  calculateCardClass(card: ICard): string {
    if (card.failed == 0) {
      return "pass";
    } else if (card.reviewed) {
      return "reviewed";
    } else if (card.oldestEquivalentCard && card.oldestEquivalentCard.reviewed) {
      return "same-status";
    } else {
      return "pending-review";
    }
  }

  calculatePercentageTooltip(card: ICard): string {
    const total = card.passed + card.skipped + card.failed;
    const parts = [];

    if (card.passed || total === 0) {
      parts.push(`${card.passed} passed`);
    }
    if (card.skipped || total === 0) {
      parts.push(`${card.skipped} skipped`);
    }
    if (card.failed || total === 0) {
      parts.push(`${card.failed} failed`);
    }
    return parts.join(", ");
  }

  calculatePercentage(passed: number, skipped: number, failed: number): number {
    const res = Math.floor((passed / (passed + skipped + failed)) * 100);
    return isNaN(res) ? 0 : res;
  }

  calculatePercentageClass(card: ICard): string {
    const percentage =  this.calculatePercentage(card.passed, card.skipped, card.failed);
    if (percentage === 100) {
      return "pass";
    } else if (percentage >= 85) {
      return "skip";
    } else {
      return "fail";
    }
  }

  calculateTrendClass(card: ICard): string {
    if (!card.previousCard) {
      return "";
    }

    const percentage =  this.calculatePercentage(card.passed, card.skipped, card.failed);
    const prevPercentage =  this.calculatePercentage(card.previousCard.passed, card.previousCard.skipped, card.previousCard.failed);

    if (percentage > prevPercentage) {
      return "fas fa-angle-up pass";
    } else if (percentage < prevPercentage) {
      return "fas fa-angle-down fail";
    }

    return "";
  }

  calculateTrendTooltip(card: ICard): string {
    if (!card.previousCard) {
      return '';
    }

    const percentage =  this.calculatePercentage(card.passed, card.skipped, card.failed);
    const prevPercentage =  this.calculatePercentage(card.previousCard.passed, card.previousCard.skipped, card.previousCard.failed);
    const diff = percentage - prevPercentage;

    if (diff === 0) {
      return '';
    }

    return `${diff > 0 ? '+':''}${diff}%`;
  }

  wasBypassUsed(card: ICard): boolean {
    return (card.reviewed && card.reviewedWithBypass) || (!card.reviewed && card.oldestEquivalentCard && card.oldestEquivalentCard.reviewed && card.oldestEquivalentCard.reviewedWithBypass);
  }

  shouldShowLastReviewed(date: Date): boolean {
    return !date || this.dateTimeService.getDaysDiff(date) > 1;
  }

  getLastReviewedTitle(date: Date): string {
    return date ? `Last reviewed at ${this.dateTimeService.getTimeFull(date)}` : "Never reviewed";
  }

  calculateLastReviewedHint(date: Date): string {
    return date ? `${this.dateTimeService.getDaysDiff(date)}d` :  "never";
  }

}
