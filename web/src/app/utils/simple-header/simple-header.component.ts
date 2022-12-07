import {Component, Input} from '@angular/core';

@Component({
  selector: 'simple-header',
  templateUrl: './simple-header.component.html',
  styleUrls: ['./simple-header.component.css']
})
export class SimpleHeaderComponent {

  @Input() titleText: string;
  @Input() backUrl: string;

}
