import {Component, Input} from '@angular/core';
import {IDefect} from "../../../../../shared/src/model";
import {EmailToDisplayNamePipe} from "../email-to-display-name.pipe";
import {DateTimeService} from "../date-time.service";
import {globalConfig} from "../../../../../shared/src/globalConfig";

@Component({
  selector: 'defect-link',
  templateUrl: './defect-link.component.html',
  styleUrls: ['./defect-link.component.css']
})
export class DefectLinkComponent {

  private static RESOLVED_DEFECT_STATUS: string[] = ['In Test','Pending Integration','Pending Test','Closed','Resolved'];

  @Input() defect: IDefect;

  @Input() jiraUrl = globalConfig.jiraUrl

  constructor(private emailToDisplayNamePipe : EmailToDisplayNamePipe,
              private dateTimeService: DateTimeService) {
  }

  isResolvedDefect(defect: IDefect): boolean {
    return DefectLinkComponent.RESOLVED_DEFECT_STATUS.some(status => defect.status === status);
  }

  calcDefectSummary(defect: IDefect): string {
    const lines: string[] = [];

    lines.push(defect.summary);
    lines.push(`Status: ${defect.status}`);
    lines.push(`Team: ${defect.rndTeam}`);
    lines.push(`Assignee: ${this.emailToDisplayNamePipe.transform(defect.assignee)}`);
    lines.push(`Created: ${this.dateTimeService.getTimeDiff(defect.created)} (${this.dateTimeService.getTimeFull(defect.created)})`);
    lines.push(`Last update: ${this.dateTimeService.getTimeDiff(defect.lastUpdate)} (${this.dateTimeService.getTimeFull(defect.lastUpdate)})`);
    lines.push(`Severity: ${defect.severity}`);

    return lines.join('\n');
  }
}
