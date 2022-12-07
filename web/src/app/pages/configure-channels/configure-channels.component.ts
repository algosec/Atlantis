import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppStateService} from "../../app-state.service";
import {IChannelSetupInfo} from "../../../../../shared/src/model";
import {ActivatedRoute, ParamMap} from "@angular/router";
import {Subscription} from "rxjs";
import {DateTimeService} from "../../utils/date-time.service";
import {ConfigureChannelsFilterPipe} from "./configure-channels-filter.pipe";
import {globalConfig} from "../../../../../shared/src/globalConfig";

@Component({
  selector: 'app-configure-channels',
  templateUrl: './configure-channels.component.html',
  styleUrls: ['./configure-channels.component.css']
})
export class ConfigureChannelsComponent implements OnInit, OnDestroy {

  version: string;
  channels: IChannelSetupInfo[];

  selected: Set<string> = new Set<string>();
  newOwner = '';

  channelFilter = '';
  ownerFilter = '';
  showArchivedOnly = false;

  subscriptions: Subscription[] = [];

  constructor(private appStateService: AppStateService,
              private route: ActivatedRoute,
              private channelsOwnersFilterPipe: ConfigureChannelsFilterPipe,
              public dateTimeService: DateTimeService) { }

  ngOnInit(): void {
    this.subscriptions.push(this.route.paramMap.subscribe((params: ParamMap) => {
      this.version = params.get('version');
      this.appStateService.loadChannelsConfiguration(this.version).subscribe(res => this.channels = res, err => this.appStateService.showErrorLoadingToast(err));
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  updateRowSelection(isSelected: boolean, id: string): void {
    if (isSelected) {
      this.selected.add(id);
    } else {
      this.selected.delete(id);
    }
  }

  toggleRowSelection(id: string): void {
    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      this.selected.add(id);
    }
  }

  submit(): void {
    if (this.getSelectedAndPresentRows() == 0) {
      this.appStateService.showWarningToast('Please select at lease one channel');
      return;
    }
    if (!this.newOwner || !this.newOwner.endsWith(globalConfig.emailDetails.domain)) {
      this.appStateService.showWarningToast('Please set a valid ' + globalConfig.tenantDetails.tenantName + ' email address for the owner');
      return;
    }
    // submit to backend
    this.appStateService.submitSetOwners('channels', this.getSelectedAndPresentChannelsIds(), this.newOwner)
        .then(_res => this.onSubmitSuccess('Owners were set successfully'))
        .catch(err => this.appStateService.showErrorLoadingToast(err));
  }

  onSubmitSuccess(msg: string): void {
    this.appStateService.showSuccessToast(msg);
    this.ngOnInit();
  }

  getSelectedAndPresentChannelsIds(): string[] {
    return this.channelsOwnersFilterPipe
        .transform(this.channels, this.channelFilter, this.ownerFilter, this.showArchivedOnly)
        .filter(x => this.selected.has(x.id))
        .map(x => x.id);
  }

  getSelectedAndPresentRows(): number {
    return this.getSelectedAndPresentChannelsIds().length;
  }

  isCheckAllChecked(): boolean {
    return this.getSelectedAndPresentRows() > 0 && this.channelsOwnersFilterPipe
        .transform(this.channels, this.channelFilter, this.ownerFilter, this.showArchivedOnly)
        .every(x => this.selected.has(x.id));
  }

  updateCheckAllSelection(value: boolean): void {
    this.channelsOwnersFilterPipe
        .transform(this.channels, this.channelFilter, this.ownerFilter, this.showArchivedOnly)
        .forEach(x => this.updateRowSelection(value, x.id));
  }

  toggleArchive(channel: IChannelSetupInfo): void {
    const newArchived = !channel.archived;
    this.appStateService.submitSetChannelArchived(channel.id, !channel.archived)
        .then(_res => this.onSubmitSuccess(`Channel was ${newArchived?'archived':'un-archived'} successfully`))
        .catch(err => this.appStateService.showErrorLoadingToast(err));
  }

}
