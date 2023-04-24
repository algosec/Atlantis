import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, ParamMap, Router} from "@angular/router";

import {AppStateService} from "../../app-state.service";
import {Subscription} from "rxjs";
import {
  CardStatus,
  IBranch,
  IChannelLatestSummary,
  IChannelsPageSearch,
  ITeam,
  IBucket
} from "../../../../../shared/src/model";
import {DateTimeService} from "../../utils/date-time.service";
import {ChannelFilterPipe} from "./channel-filter.pipe";
import {calculateAvailableBuckets, isBucketMatch} from "../../utils/buckets";
import {ChartDefinition, createSummaryChart, ResultsSummary} from "../../utils/result-chart";
import {CardsUtilsService} from "../../utils/cards-utils.service";
import {ClientStorageService} from "../../utils/client-storage.service";

@Component({
  selector: 'app-channels',
  templateUrl: './channels.component.html',
  styleUrls: ['./channels.component.css'],
})
export class ChannelsComponent implements OnInit, OnDestroy  {

  teams: ITeam[] = [];

  selectedTeam: ITeam;
  requestedBranch: string;
  selectedBranch: IBranch;
  availableBuckets: Set<string>;
  allBuckets: IBucket[];

  channels: IChannelLatestSummary[] = [];

  filteredResults: IChannelLatestSummary[] = [];
  passJobs: number;
  sameStatusJobs: number;
  reviewedJobs: number;
  pendingJobs: number;
  generalChart: ChartDefinition;
  search: IChannelsPageSearch;
  favorites: Set<string>;

  subscriptions: Subscription[] = [];
  isLoading: boolean;

  constructor(private appStateService: AppStateService,
              private clientStorageService: ClientStorageService,
              private channelFilterPipe: ChannelFilterPipe,
              private router: Router,
              private route: ActivatedRoute,
              private ref: ChangeDetectorRef,
              private cardsUtilsService: CardsUtilsService,
              public dateTimeService: DateTimeService) { }

  ngOnInit(): void {
    this.subscriptions.push(this.appStateService.getSyncRequestObservable().subscribe(() => this.loadChannels()));
    this.loadUserSavedState();
    this.appStateService.loadTeams()
        .then(res => this.onTeamsLoad(res))
        .catch(err => this.appStateService.showErrorLoadingToast(err));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  onTeamsLoad(teams: ITeam[]): void {
    this.teams = teams;
    this.subscriptions.push(this.route.paramMap.subscribe((params: ParamMap) => this.onUpdateTeam(params.get('version'), params.get('branch'))));
  }

  onUpdateTeam(requestedVersion: string, branch: string): void {
    this.selectedTeam = this.findTeam(requestedVersion);
    this.requestedBranch = branch;
    this.selectedBranch = null; // will be populated later

    // if no teams found - no need to load them
    if (this.teams.length == 0) {
      return;
    }
    if(this.selectedTeam){
      this.allBuckets = this.selectedTeam.buckets
    }

    else{
      const error = `No such team '${requestedVersion}' - navigating to the default team`;
      if (requestedVersion && requestedVersion !== 'latest') {
        this.appStateService.showWarningToast(error);
      } else {
        console.log(error);
      }

      // fallback to the default team
      this.navigateToVersion(this.teams[0].version);
      this.allBuckets = this.teams[0].buckets
      return;
    }

    this.selectedBranch = this.selectedTeam.branches.find((b: IBranch) => b.identifiers.includes(this.requestedBranch));
    this.loadChannels();
  }

  loadChannels(): void {
    if (this.isLoading || !this.selectedTeam || !this.selectedBranch) {
      return;
    }
    this.isLoading = true;
    this.appStateService.loadChannelsSummary(this.selectedTeam.id, this.selectedBranch.id)
        .then(res => this.loadFinished(res))
        .catch(err => this.appStateService.showErrorLoadingToast(err))
        .finally(() => this.isLoading = false);
  }

  private loadFinished(res: IChannelLatestSummary[]) {
    this.channels = res;
    this.calculateBuckets();
    this.updateSearch();
  }

  private calculateBuckets(): void {
    const allTitles = this.channels.map(x => x.title);
    this.availableBuckets = new Set();

    calculateAvailableBuckets(this.allBuckets, allTitles).forEach(x => this.availableBuckets.add(x.title));

    if (allTitles.some((title: string) => this.allBuckets.every((b: IBucket) => !isBucketMatch(b, title)))) {
      this.availableBuckets.add('Others');
    }

    // make sure that the "bucket" search field value is possible value
    if (!this.availableBuckets.has(this.search.bucket)) {
      this.search.bucket = 'All';
      this.persistUserSavedState();
    }
  }

  updateSearch(): void {
    this.calculateSearchTotals();
    this.calculateCharts();
    this.persistUserSavedState();
  }

  persistUserSavedState(): void {
    this.clientStorageService.persistToLocalStorage('favorites', Array.from(this.favorites));
    this.clientStorageService.persistToSessionStorage('channels-summary-state', this.search);
  }

  loadUserSavedState(): void {
    const dataFromStorage: Partial<IChannelsPageSearch> = this.clientStorageService.getFromSessionStorage<IChannelsPageSearch>('channels-summary-state');

    this.search = {
      text: dataFromStorage?.text || '',
      bucket: dataFromStorage?.bucket || 'All',
      passedOnly: dataFromStorage?.passedOnly || false,
      failuresOnly: dataFromStorage?.failuresOnly || false,
      pendingOnly: dataFromStorage?.pendingOnly || false,
      reviewedOnly: dataFromStorage?.reviewedOnly || false,
      sameStatusOnly: dataFromStorage?.sameStatusOnly || false,
      favoritesOnly: dataFromStorage?.favoritesOnly || false,
    };

    this.favorites = new Set<string>(this.clientStorageService.getFromLocalStorage('favorites') || []);
  }

  resetSearch(): void {
    this.search = {
      text: '',
      bucket: 'All',
      passedOnly: false,
      failuresOnly: false,
      pendingOnly: false,
      reviewedOnly: false,
      sameStatusOnly: false,
      favoritesOnly: false,
    };
    this.updateSearch();
  }

  calculateSearchTotals(): void {
    this.filteredResults = this.channelFilterPipe.transform(this.channels, this.favorites, this.search.text, this.search.bucket, this.search.passedOnly, this.search.failuresOnly, this.search.pendingOnly, this.search.reviewedOnly, this.search.sameStatusOnly, this.search.favoritesOnly, this.allBuckets);
  }

  private calculateCharts() {
    const generalResult: ResultsSummary = new ResultsSummary();
    const failuresAmount: Map<string, number> = new Map<string, number>();

    this.passJobs = 0;
    this.sameStatusJobs = 0;
    this.reviewedJobs = 0;
    this.pendingJobs = 0;

    this.filteredResults
        .filter((channelLatestSummary: IChannelLatestSummary) => !this.cardsUtilsService.isStabilization(channelLatestSummary.latestCard))
        .forEach((channelLatestSummary: IChannelLatestSummary) => {
          generalResult.add(channelLatestSummary.latestCard);
          failuresAmount.set(channelLatestSummary.title, channelLatestSummary.latestCard.failed + channelLatestSummary.latestCard.skipped);
          switch (this.cardsUtilsService.calculateCardStatus(channelLatestSummary.latestCard)) {
            case CardStatus.PASS: this.passJobs++; break;
            case CardStatus.PENDING: this.pendingJobs++; break;
            case CardStatus.SAME_STATUS: this.sameStatusJobs++; break;
            case CardStatus.REVIEWED: this.reviewedJobs++; break;
          }
        });

    this.generalChart = createSummaryChart('doughnut', `General Summary (${generalResult.totalTestCases()} tests)`, generalResult);
  }

  navigateToVersion(version: string): void {
    // when navigation to another version, always move to the master branch
    const team: ITeam = this.findTeam(version);

    let targetBranch : IBranch;
    targetBranch = team.branches.find(b => b.title === team.defaultBranch);
    targetBranch = targetBranch || (team.branches.length > 0 && team.branches[0]);
    const targetBranchTitle = targetBranch?.title || 'unknown';

    this.router.navigate(['/channels', version, targetBranchTitle]);
  }

  navigateToBranch(branchId: string):void {
    const targetBranch: IBranch = this.selectedTeam.branches.find((b: IBranch) => b.id === parseInt(branchId));
    this.router.navigate(['/channels', this.selectedTeam.version, targetBranch.identifiers.sort()[0]]); // sort is to select numeric identifier and not string name
  }

  private findTeam(version: string) {
    const filteredArray = this.teams.filter(v => v.version === version);
    return (filteredArray.length === 0) ? null : filteredArray[0];
  }

  trackByFn(index: number, channel: IChannelLatestSummary): string {
    return channel.id;
  }

  favoriteClass(channel: IChannelLatestSummary): string {
    return this.favorites.has(channel.title) ? 'fas' : 'far';
  }

  favoriteTooltip(channel: IChannelLatestSummary): string {
    return this.favorites.has(channel.title) ? 'Click to remove from favorites' : 'Click to add to favorites';
  }

  toggleFavorite(channel: IChannelLatestSummary): void {
    if (this.favorites.has(channel.title)) {
      this.favorites.delete(channel.title);
    } else {
      this.favorites.add(channel.title);
    }
    this.persistUserSavedState();
  }

  isLoadingForFirstTime(): boolean {
    return this.channels.length == 0 && this.isLoading;
  }

}
