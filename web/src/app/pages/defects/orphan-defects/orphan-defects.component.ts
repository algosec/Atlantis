import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppStateService} from "../../../app-state.service";
import {IDefect} from "../../../../../../shared/src/model";
import {Subscription} from "rxjs";

@Component({
  selector: 'app-orphan-defects',
  templateUrl: './orphan-defects.component.html',
  styleUrls: ['./orphan-defects.component.css']
})
export class OrphanDefectsComponent implements OnInit, OnDestroy {

  defects: IDefect[];

  subscriptions: Subscription[] = [];

  constructor(private appStateService: AppStateService) { }

  ngOnInit(): void {
    this.subscriptions.push(this.appStateService.getSyncRequestObservable().subscribe(() => this.loadOrphanDefects()));
    this.loadOrphanDefects();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  loadOrphanDefects(): void {
    this.appStateService.loadOrphanDefects().subscribe(res => this.defects = res.filter(item => item.status != 'Closed' && item.status != 'Resolved'), err => this.appStateService.showErrorLoadingToast(err));
  }

}
