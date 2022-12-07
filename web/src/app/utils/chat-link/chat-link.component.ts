import {Component, Input} from '@angular/core';

@Component({
  selector: 'chat-link',
  templateUrl: './chat-link.component.html',
  styleUrls: ['./chat-link.component.css']
})
export class ChatLinkComponent{

  @Input() email: string;

}
