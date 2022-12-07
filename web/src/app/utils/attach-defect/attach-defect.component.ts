import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {AppStateService} from "../../app-state.service";
import {Subscription} from "rxjs";

@Component({
  selector: 'attach-defect',
  templateUrl: './attach-defect.component.html',
  styleUrls: ['./attach-defect.component.css']
})
export class AttachDefectComponent {

  @Input() channelId: string;
  @Input() alwaysOpen = false;
  @Output() success: EventEmitter<void> = new EventEmitter<void>();
  @ViewChild('defectInput') defectInput: ElementRef;

  isHover = false;
  isFocused = false;
  defectValue: string;
  isLoading = false;

  escapeKeyPressSubscription: Subscription;

  constructor(private appStateService: AppStateService) { }

  isActive(): boolean {
    return this.alwaysOpen || this.isHover || this.isFocused || !!this.defectValue;
  }

  submit(): void {
    if (this.isLoading) {
      return;
    }
    if (!this.defectValue) {
      this.defectInput.nativeElement.focus();
      return;
    }
    this.isLoading = true;
    this.appStateService.linkDefectToChannel(this.channelId, this.defectValue.trim())
        .then(res => this.onSuccess(res.message))
        .catch(err => this.appStateService.showErrorLoadingToast(err))
        .finally(() => this.isLoading = false);
  }

  onSuccess(message: string): void {
    this.close();
    this.appStateService.showSuccessToast(message);
    this.success.emit();
  }

  onDefectValueChanged(): void {
    if (this.defectValue && !this.escapeKeyPressSubscription) {
      // register for escape key press event only at the first time
      this.escapeKeyPressSubscription = this.appStateService.getEscapeKeyPressedObservable()
          .subscribe(() => this.closeIfFocused());
    } else if (!this.defectValue) {
      // if not value, unregister
      this.unsubscribeFromEscapeKeySubscription();
    }
  }

  closeIfFocused(): void {
    if (this.isFocused) {
      this.close();
    }
  }

  close(): void {
    this.unsubscribeFromEscapeKeySubscription();
    this.defectValue = null;
    this.defectInput.nativeElement.blur();
  }

  unsubscribeFromEscapeKeySubscription(): void {
    if (this.escapeKeyPressSubscription) {
      this.escapeKeyPressSubscription.unsubscribe();
      this.escapeKeyPressSubscription = null;
    }
  }
}
