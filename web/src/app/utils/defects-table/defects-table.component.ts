import {Component, Input} from '@angular/core';
import {IDefect} from "../../../../../shared/src/model";
import {DateTimeService} from "../date-time.service";

@Component({
  selector: 'defects-table',
  templateUrl: './defects-table.component.html',
  styleUrls: ['./defects-table.component.css']
})
export class DefectsTableComponent {

  @Input() defects: IDefect[];

  constructor(public dateTimeService: DateTimeService) { }

}
