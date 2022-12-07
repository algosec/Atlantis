import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, ParamMap} from "@angular/router";
import {AppStateService} from "../../app-state.service";
import {Subscription} from "rxjs";
import {IBranch, IChannelExtendedSummary} from "../../../../../shared/src/model";
import {HttpErrorResponse} from "@angular/common/http";

@Component({
  selector: 'app-channel-history',
  templateUrl: './channel.component.html',
  styleUrls: ['./channel.component.css']
})
export class ChannelComponent implements OnInit, OnDestroy {

  showDefectHistory = false;

  requestedVersion: string;
  requestedBranch: string;
  requestedChannel: string;

  isShowMasterBranch = false;
  isAllBranches: boolean;

  channel: IChannelExtendedSummary;
  selectedBranch: IBranch;

  error: string;

  subscriptions: Subscription[] = [];

  constructor(private appStateService: AppStateService,
              private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.subscriptions.push(this.appStateService.getSyncRequestObservable().subscribe(() => this.loadChannel()));
    this.subscriptions.push(this.route.paramMap.subscribe((params: ParamMap) => {
      this.requestedVersion = params.get('version');
      this.requestedBranch = params.get('branch');
      this.requestedChannel = params.get('channel');
      this.isAllBranches = this.requestedBranch === 'all';
      this.loadChannel();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  loadChannel(): void {
    if (!this.requestedVersion || !this.requestedChannel) {
      return;
    }
    this.error = null;
    this.appStateService.loadChannel(this.requestedVersion, this.requestedChannel).subscribe(res => this.onLoad(res), err => this.onError(err));
  }

  onLoad(res: IChannelExtendedSummary): void {
    this.channel = res;
    this.selectedBranch = this.isAllBranches ? null : this.selectedBranch = this.channel.branches.find((b: IBranch) => b.id === Number(this.requestedBranch) || b.identifiers.includes(this.requestedBranch));
  }

  onError(err: HttpErrorResponse): void {
    if (err.status === 400 && err.error?.message) {
      this.error = err.error.message;
      return;
    }

    // general error toast
    this.error = 'A fatal error occurred';
    this.appStateService.showErrorLoadingToast(err);
  }

  isStabilizationUrl(url: string): boolean {
    return !!url.match(/-STABILIZATION\/?$/);
  }

  toggleDefectHistory(): void {
    this.showDefectHistory = !this.showDefectHistory;
  }
  
}
