import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, ParamMap} from "@angular/router";
import {Subscription} from "rxjs";
import {AppStateService} from "../../app-state.service";
import {IBranchExtendedSummary} from "../../../../../shared/src/model";
import {DateTimeService} from "../../utils/date-time.service";
import {globalConfig} from "../../../../../shared/src/globalConfig";

@Component({
  selector: 'app-configure-branches',
  templateUrl: './configure-branches.component.html',
  styleUrls: ['./configure-branches.component.css']
})
export class ConfigureBranchesComponent implements OnInit, OnDestroy {

  version: string;
  branches: IBranchExtendedSummary[];

  checkedBranch: number;
  newOwner = '';
  newTitle = '';

  subscriptions: Subscription[] = [];
  titleFilter = '';
  ownerFilter = '';
  showArchivedOnly = false;

  constructor(private appStateService: AppStateService,
              private route: ActivatedRoute,
              public dateTimeService: DateTimeService) { }

  ngOnInit(): void {
    this.subscriptions.push(this.route.paramMap.subscribe((params: ParamMap) => {
      this.version = params.get('version');
      this.appStateService.loadBranchesConfiguration(this.version).subscribe(res => this.branches = res, err => this.appStateService.showErrorLoadingToast(err));
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  toggleSelection(branch: IBranchExtendedSummary): void {
    this.checkedBranch = (this.checkedBranch === branch.id) ? null : branch.id;
  }

  submit(): void {
    if (!this.checkedBranch) {
      this.appStateService.showWarningToast('Please select a branch');
      return;
    }
    if(!this.newOwner && !this.newTitle) {
      this.appStateService.showWarningToast('Please set owner or/and title');
      return;
    }
    if(this.newOwner) {
      if(!this.newOwner.endsWith(globalConfig.emailDetails.domain)) {
        this.appStateService.showWarningToast('Please set a valid AlgoSec email address for the owner');
        return;
      }
      this.appStateService.submitSetOwners('branches', [this.checkedBranch], this.newOwner)
          .then(_res => this.onSubmitSuccess('Owner of branch was updated successfully'))
          .catch(err => this.appStateService.showErrorLoadingToast(err));
    }
    if(this.newTitle) {
      this.appStateService.submitSetTitle(this.checkedBranch, this.newTitle)
          .then(_res => this.onSubmitSuccess('Title of branch was updated successfully'))
          .catch(err => this.appStateService.showErrorLoadingToast(err));
    }
  }

  onSubmitSuccess(message: string): void {
    this.appStateService.showSuccessToast(message);
    this.ngOnInit();
  }

  toggleArchive(branch: IBranchExtendedSummary): void {
    const newArchived = !branch.archived;
    this.appStateService.submitSetBranchArchived(branch.id, !branch.archived)
        .then(_res => this.onSubmitSuccess(`Branch was ${newArchived?'archived':'un-archived'} successfully`))
        .catch(err => this.appStateService.showErrorLoadingToast(err));
  }

}
