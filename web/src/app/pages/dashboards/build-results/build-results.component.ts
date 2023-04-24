import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AppStateService} from "../../../app-state.service";
import {
  CardStatus,
  IBuildsByBranchByTeam,
  IBuildCountByChannel,
  ICardBuildSummary,
  ITeam,
  IBucket
} from "../../../../../../shared/src/model";
import {calculateAvailableBuckets, isBucketMatch} from "../../../utils/buckets";
import {Subscription} from "rxjs";
import {CardsUtilsService} from "../../../utils/cards-utils.service";
import {ActivatedRoute, ParamMap, Router} from "@angular/router";
import {UpdateBuildEvent} from "../../../utils/build-selector/build-selector.component";
import {
  ChartDefinition,
  createFailuresAmountChart,
  createSummaryChart,
  ResultsSummary
} from "../../../utils/result-chart";

@Component({
  selector: 'app-build-results',
  templateUrl: './build-results.component.html',
  styleUrls: ['./build-results.component.css']
})
export class BuildResultsComponent implements OnInit, OnDestroy {

  teams: ITeam[];
  allBuckets: IBucket[];
  version: string;
  buildsByBranchByTeams: IBuildsByBranchByTeam[];
  buildCountPerChannel: IBuildCountByChannel[];

  availableBuckets: IBucket[];

  generalResult: ResultsSummary;
  results: Map<string, ResultsSummary>;

  generalChart: ChartDefinition;
  bucketCharts: ChartDefinition[];
  failuresAmountCharts: Map<string, ChartDefinition>;

  branch: string;
  buildNumber: string;

  majorVersion: string;
  isLoading = true;

  applianceBuild: string;
  passJobs: number;
  sameStatusJobs: number;
  reviewedJobs: number;
  pendingJobs: number;

  subscriptions: Subscription[] = [];

  buildCards: Map<string, ICardBuildSummary> = new Map<string, ICardBuildSummary>();
  numberOfRerunsPerChannel: Map<string, number> = new Map<string, number>();
  channelsList: string[] = [];

  constructor(private router: Router,
              private route: ActivatedRoute,
              private appStateService: AppStateService,
              public cardsUtilsService: CardsUtilsService,
              private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.appStateService.loadTeams()
        .then(res => this.onTeamsLoad(res))
        .catch(err => this.appStateService.showErrorLoadingToast(err));
  }

  onTeamsLoad(teams: ITeam[]): void {
    this.teams = teams;
    his.allBuckets = this.teams[0].buckets
    this.route.paramMap.subscribe(
        (params: ParamMap) => {
          this.branch = params.get('branch');
          this.buildNumber = params.get('build');
          this.updateRoute();
        }
    );

    Promise.all([this.appStateService.loadBuilds(),this.appStateService.loadCountBuildPerChannel(this.buildNumber)])
        .then(res => this.onLoad(res[0], res[1]))
        .catch(err => this.appStateService.showErrorLoadingToast(err));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  onLoad(res1: IBuildsByBranchByTeam[], res2:IBuildCountByChannel[]): void {
    this.buildsByBranchByTeams = res1;
    this.buildCountPerChannel = res2;
    this.buildMapOfRuns(this.buildCountPerChannel);

    this.loadBuildResults();
  }

  updateRoute(): void {
    if (!this.branch || !this.buildNumber) {
      return;
    }
    this.router.navigate(['/dashboards', 'build-results', this.branch, this.buildNumber]);
  }

  updateBuild(info: UpdateBuildEvent): void {
    this.branch = info.branch;
    this.buildNumber = info.build;
    this.updateRoute();
    this.loadBuildResults();
    this.cdr.detectChanges();
    this.version = info.version;
    this.allBuckets = this.teams.find(x => x.version === this.version).buckets;
  }

  updateBranch(): void {
    this.updateRoute();
    this.loadBuildResults();
  }

  loadBuildResults(): void {
    if (!this.buildNumber) {
      return;
    }
    this.isLoading = true;
    this.majorVersion = this.buildNumber.match(/^(\d+\.\d+)/) != null ? this.buildNumber.match(/^(\d+\.\d+)/)[1] : this.buildNumber;

    Promise.all([this.appStateService.loadCardsByBranchAndBuild(this.branch, this.buildNumber), this.appStateService.loadCountBuildPerChannel(this.buildNumber)])
        .then(res => this.onLoadFinished(res[0], res[1]))
        .catch(err => this.appStateService.showErrorLoadingToast(err))
        .finally(() => this.isLoading = false);

  }

  getChannelsByBucket(bucket: IBucket): string[] {
    return this.channelsList.filter((channel: string) => isBucketMatch(bucket, channel));
  }

  private onLoadFinished(cards: ICardBuildSummary[], buildCount:IBuildCountByChannel[]) {
    // filter out stabilization cards
    cards = cards.filter((card: ICardBuildSummary) => !this.cardsUtilsService.isStabilization(card));

    this.calculateChartsData(cards);
    this.buildCards = new Map(cards.map(i => [i.channelTitle, i]));
    this.channelsList = Array.from(this.buildCards.keys()).sort();
    this.applianceBuild = Array.from(new Set<string>(cards.map(c => c.metaData.applianceBuild).filter(c => !!c))).join(' ');
    this.calculateCardStatus(cards);
    this.buildCountPerChannel = buildCount;
    this.buildMapOfRuns(this.buildCountPerChannel);
  }

  private calculateCardStatus(cards: ICardBuildSummary[]) {
    this.passJobs = 0;
    this.sameStatusJobs = 0;
    this.reviewedJobs = 0;
    this.pendingJobs = 0;

    cards.forEach((card: ICardBuildSummary) => {
      switch (this.cardsUtilsService.calculateCardStatus(card)) {
        case CardStatus.PASS: this.passJobs++; break;
        case CardStatus.PENDING: this.pendingJobs++; break;
        case CardStatus.SAME_STATUS: this.sameStatusJobs++; break;
        case CardStatus.REVIEWED: this.reviewedJobs++; break;
      }
    });
  }

  private calculateChartsData(cards: ICardBuildSummary[]) {
    const allTitles = cards.map(x => x.channelTitle);

    this.availableBuckets = calculateAvailableBuckets(this.allBuckets, allTitles);
    this.generalResult = new ResultsSummary();
    this.results = new Map<string, ResultsSummary>();
    this.failuresAmountCharts = new Map<string, ChartDefinition>();
    this.bucketCharts = [];
    const failuresAmount: Map<string, Map<string, number>> = new Map<string, Map<string, number>>();

    this.availableBuckets.forEach((b: IBucket) => {
      this.results.set(b.title, new ResultsSummary());
      failuresAmount.set(b.title, new Map<string, number>());
    });

    cards.forEach((card: ICardBuildSummary) => this.availableBuckets
        .filter((b: IBucket) => isBucketMatch(b, card.channelTitle))
        .forEach((b: IBucket) => {
          this.results.get(b.title).add(card);
          if (card.failed > 0) {
            failuresAmount.get(b.title).set(card.channelTitle, card.failed + card.skipped);
          }
        }));

    cards.forEach((card: ICardBuildSummary) => this.generalResult.add(card));

    this.generalChart = createSummaryChart('pie', `General Summary (${this.generalResult.totalTestCases()} tests)`, this.generalResult);

    this.availableBuckets.forEach((b: IBucket) => {
      const bucketSummary = this.results.get(b.title);
      this.bucketCharts.push(createSummaryChart('doughnut', `${b.title} (${bucketSummary.totalTestCases()} tests)`, bucketSummary));
      this.failuresAmountCharts.set(b.title, createFailuresAmountChart('pie', `Failed and skipped (${bucketSummary.calculateFailureAndSkippedRate()}%)`, failuresAmount.get(b.title)));
    });
  }

  private buildMapOfRuns(x: IBuildCountByChannel[]): void{
    x.forEach(y => this.numberOfRerunsPerChannel.set(y.title,Number(y.runCount)));
  }

}
