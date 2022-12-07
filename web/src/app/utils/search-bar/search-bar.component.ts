import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent {

  @Input() search: string;
  @Output() searchChange: EventEmitter<string> = new EventEmitter<string>();

  @Output() resetChange: EventEmitter<void> = new EventEmitter<void>();

  @Input() totalResults: number;
  @Input() filteredResults: number;
  @Input() isLoading: boolean;

  reset(): void {
    this.resetChange.emit();
  }

  update(): void {
    this.searchChange.emit(this.search);
  }
}