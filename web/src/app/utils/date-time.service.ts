import { Injectable } from '@angular/core';
import  * as moment from "moment";
import {duration} from "moment";
import {IBranchExtendedSummary, ICard, IChannelSetupInfo, IDefect} from "../../../../shared/src/model";

@Injectable({
  providedIn: 'root'
})
export class DateTimeService {

  getTimeDiff(time: Date): string {
    return moment(time).fromNow();
  }

  getTimeFull(time: Date): string {
    return moment(time).format("LLLL");
  }

  getTimeDiffAndFull(time: Date): string {
    return `${this.getTimeDiff(time)} (${this.getTimeFull(time)})`;
  }

  getDurationBetween(time: Date, base: Date): string {
    return duration(moment(time).diff(base)).humanize();
  }

  calcDefectLastActivity(defect: IDefect): string {
    return this.getTimeDiff(defect.lastUpdate);
  }

  getDaysDiff(time: Date): number {
    return moment().diff(moment(time), 'days');
  }

  getDefectLastActivityColorClass(defect: IDefect): string {
    const diff =  this.getDaysDiff(defect.lastUpdate);
    if (diff < 3) {
      return "pass";
    } else if (diff < 7) {
      return "skip";
    } else {
      return "fail";
    }
  }

  getChannelLastActivityColorClass(channel: IChannelSetupInfo): string {
    if (!channel.latestCardTime) {
      return "fail";
    }
    const diff =  moment().diff(moment(channel.latestCardTime), 'days');
    if (diff < 3) {
      return "pass";
    } else if (diff < 10) {
      return "skip";
    } else {
      return "fail";
    }
  }

  getCardActivityColorClass(card: ICard): string {
    const diff =  moment().diff(moment(card.created), 'days');
    if (diff < 3) {
      return ""; // no need color
    } else if (diff < 7) {
      return "skip";
    } else {
      return "fail";
    }
  }

  getBranchLastActivityColorClass(branch: IBranchExtendedSummary): string {
    if (!branch.latestCardTime) {
      return "fail";
    }
    const diff =  moment().diff(moment(branch.latestCardTime), 'days');
    if (diff < 7) {
      return "pass";
    } else if (diff < 21) {
      return "skip";
    } else {
      return "fail";
    }
  }

}
