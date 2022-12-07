import {Directive, ElementRef, HostListener} from '@angular/core';

@Directive({
  selector: '[search-keyboard-hook]'
})
export class SearchKeyboardHookDirective {

  constructor(private el: ElementRef) { }

  @HostListener('window:keydown.control.f', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
      this.el.nativeElement.focus();
      event.preventDefault(); // prevent browser's search
  }

}
