import {Component, HostListener, OnInit} from '@angular/core';
import {AppStateService} from "./app-state.service";
import {ExportPdfService} from "./utils/export-pdf.service";
import { v4 as uuidv4 } from 'uuid';
import {AuthService} from "./auth/auth.service";
import {IUserInfo} from "../../../shared/src/auth/model";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent implements OnInit {

  currentUser: IUserInfo;
  isJiraSyncRunning: boolean;
  isPdfRunning: boolean;

  constructor (private appStateService: AppStateService,
               private exportPdfService: ExportPdfService,
               public authService: AuthService) {
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(x => this.currentUser = x);
  }

  triggerSync(): void {
    if (this.isJiraSyncRunning) {
      return;
    }
    this.isJiraSyncRunning = true;
    this.appStateService.triggerSyncDefects()
        .catch(err => this.appStateService.showErrorLoadingToast(err))
        .finally(() => setTimeout(() => this.isJiraSyncRunning = false, 1000));
  }

  exportToPdf(): void {
    if (this.isPdfRunning) {
      return;
    }
    this.isPdfRunning = true;
    this.exportPdfService.exportAndDownload('Atlantis-' + uuidv4().substr(0,8))
        .catch(err => this.appStateService.showErrorLoadingToast(err))
        .finally(() => this.isPdfRunning = false);
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(): void {
    this.appStateService.broadcastEscapeKeyPressed();
  }

}
