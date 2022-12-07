import {Component, Input} from '@angular/core';
import {ICardBuildSummary} from "../../../../../shared/src/model";
import {CardsUtilsService} from "../cards-utils.service";

@Component({
    selector: 'job-build-status',
    templateUrl: './job-build-status.component.html',
    styleUrls: ['./job-build-status.component.css']
})
export class JobBuildStatusComponent {

    @Input() card: ICardBuildSummary;

    constructor(public cardsUtilsService: CardsUtilsService) { }



    calculatePercentage(): number {
        const res = Math.floor((this.card.passed / (this.card.passed + this.card.skipped + this.card.failed)) * 100);
        return isNaN(res) ? 0 : res;
    }

    calculatePercentageClass(): string {
        const percentage = this.calculatePercentage();
        if (percentage === 100) {
            return "pass";
        } else if (percentage >= 85) {
            return "skip";
        } else {
            return "fail";
        }
    }

    isHidden(val: number): string {
        if (val === 0) {
            return "gray";
        } else {
            return "";
        }
    }

}
