import {Component, OnDestroy, OnInit} from '@angular/core';
import {IBranch, IBuildTrendItem, ITeam} from "../../../../../../shared/src/model";
import {randomColor} from "randomcolor";
import {Subscription} from "rxjs";
import {AppStateService} from "../../../app-state.service";
import {Color, Label} from "ng2-charts";
import {ChartDataSets, ChartOptions} from "chart.js";
import {ActivatedRoute, ParamMap, Router} from "@angular/router";
import {BUCKETS, calculateAvailableBuckets, IBucket, isBucketMatch} from "../../../utils/buckets";

type TrendType = 'pass-rate' | 'total-tests';

interface IPassRate {
    data: number[];
    label: string;
    hidden: boolean;
}

function prettyPercentage(n) {
  const res = Math.round(n * 10000) / 100;
  return isNaN(res) ? 0 : res;
}

class ResultsSummary {
  passed = 0;
  skipped = 0;
  failed = 0;
  skippedByUser = 0;

  public add(buildTrendItem: IBuildTrendItem): void {
    this.passed += buildTrendItem.passed;
    this.skipped += buildTrendItem.skipped;
    this.failed += buildTrendItem.failed;
  }

  public totalTestCases(): number {
    return this.passed + this.failed + this.skipped + this.skippedByUser;
  }

  public calculatePercentage(n: number): number {
    return prettyPercentage(n / (this.passed + this.skipped + this.skippedByUser + this.failed));
  }

  public calculatePassRate(): number {
    return this.calculatePercentage(this.passed + this.skippedByUser);
  }
}

class LineData {
  data: Map<string, ResultsSummary> = new Map<string, ResultsSummary>();

  constructor (public title: string, public color: string) {
  }

  public add(buildTrendItem: IBuildTrendItem) {
    if (!this.data.has(buildTrendItem.build)) {
      this.data.set(buildTrendItem.build, new ResultsSummary());
    }
    this.data.get(buildTrendItem.build).add(buildTrendItem);
  }

  public removeBuilds(builds: string[]) {
    builds.forEach(build => this.data.delete(build));
  }

  public composePassRate(builds: string[], hidden: boolean): IPassRate {
    return {
      data: builds.map(x => this.data.get(x)?.calculatePassRate()),
      label: this.title,
      hidden: hidden
    };
  }

  public composeTotalTests(builds: string[], hidden: boolean) {
    return {
      data: builds.map(x => this.data.get(x)?.totalTestCases()),
      label: this.title,
      hidden: hidden
    };
  }

  public composeColor() {
    return {
      backgroundColor: 'transparent',
      borderColor: this.color,
    }
  }

}

@Component({
  selector: 'app-branch-trend',
  templateUrl: './branch-trend.component.html',
  styleUrls: ['./branch-trend.component.css']
})
export class BranchTrendComponent implements OnInit, OnDestroy {
  teams: ITeam[];

  initialVersion: string;
  initialBranch: string;

  selectedTeam: ITeam;
  selectedBranch: IBranch;
  selectedTrendType: TrendType = 'pass-rate';

  hasChartData: boolean;
  generalLine: LineData;
  bucketLines: Map<string, LineData>;
  labels: string[];

  lineChartData: ChartDataSets[];
  lineChartLabels: Label[];
  lineChartOptions: (ChartOptions & { annotation: unknown });
  lineChartColors: Color[] = [];
  lineChartLegend = true;
  lineChartType = 'line';
  lineChartPlugins = [];

  subscriptions: Subscription[] = [];
  isLoading: boolean;

  constructor(private router: Router,
              private route: ActivatedRoute,
              private appStateService: AppStateService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.initialVersion = params.get('version') || '';
      this.initialBranch = params.get('branch') || '';
      this.navigateToVersion(this.initialVersion, this.initialBranch);
    });
    this.appStateService.loadTeams()
        .then(res => this.onTeamsLoad(res))
        .catch(err => this.appStateService.showErrorLoadingToast(err));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  updateRoute(): void {
    this.router.navigate(['/dashboards/', 'branch-trend', this.selectedTeam.version, this.selectedBranch.title]);
  }

  onTeamsLoad(teams: ITeam[]): void {
    this.teams = teams;
    this.navigateToVersion(this.initialVersion, this.initialBranch);
  }

  navigateToVersion(version?: string, branch?: string): void {
    if (!this.teams || this.teams.length == 0) {
      return;
    }
    version = version || this.teams[0].version;
    branch = branch || this.teams[0].defaultBranch;
    this.selectedTeam = this.teams.filter(v => v.version === version)[0];
    this.selectedBranch = this.selectedTeam.branches.find(x => x.title === branch) || this.selectedTeam.branches.find(x => x.title === this.teams[0].defaultBranch);
    this.navigateToBranch(this.selectedBranch.id.toString());
  }

  navigateToBranch(branchId: string): void {
    this.selectedBranch = this.selectedTeam.branches.find((b: IBranch) => b.id === Number(branchId));
    this.loadBranch();
    this.updateRoute();
  }

  loadBranch(): void {
    if (this.isLoading || !this.selectedTeam || !this.selectedBranch) {
      return;
    }
    this.isLoading = true;
    this.hasChartData = false;
    this.appStateService.loadBranchTrend(this.selectedBranch.id)
        .then(res => this.loadFinished(res))
        .catch(err => this.appStateService.showErrorLoadingToast(err))
        .finally(() => this.isLoading = false);
  }

  private loadFinished(res: IBuildTrendItem[]) {
    this.generalLine = new LineData("general", "black");
    this.bucketLines = new Map<string, LineData>();

    const channels = Array.from(new Set<string>(res.map(x => x.title)));
    const builds = new Set<string>();
    const bucketTitles = calculateAvailableBuckets(channels).map(x => x.title);

    // populate each bucket with initial line object
    bucketTitles.forEach(x => this.bucketLines.set(x, new LineData(x, randomColor({luminosity: 'light', alpha: 0.5}))));

    // re-map data
    res.forEach((buildTrendItem) => {
      // skip item that does not match to a bucket
      const bucket: IBucket = BUCKETS.find((bucket: IBucket) => isBucketMatch(bucket, buildTrendItem.title));
      if (!bucket) {
        return;
      }

      // aggregate
      builds.add(buildTrendItem.build);
      this.bucketLines.get(bucket.title).add(buildTrendItem);
      this.generalLine.add(buildTrendItem);
    });

    // find irrelevant builds and remove them from aggregations
    const irrelevantBuilds = this.findIrrelevantBuilds(this.generalLine);
    irrelevantBuilds.forEach(x => builds.delete(x));
    this.bucketLines.forEach((line: LineData) => line.removeBuilds(irrelevantBuilds));
    this.generalLine.removeBuilds(irrelevantBuilds);

    this.labels = Array.from(builds);
    this.hasChartData = true;
    this.generateChartData();
  }

  private findIrrelevantBuilds(generalLine: LineData): string[] {
    return Array.from(generalLine.data.keys())
        .filter(build => !this.isTotalTestCasesGood(generalLine.data.get(build).totalTestCases()))
  }

  private isTotalTestCasesGood(total: number) {
    if (total < 400) { // CI2.5
      return false;
    } else if (this.selectedBranch.title === 'master' && total < 3000) { // CI3
      return false;
    }
    return true;
  }

  generateChartData(): void {
    this.lineChartLabels = Array.from(this.labels);
    this.lineChartData = [];
    this.lineChartColors = [];

    this.lineChartData.push(this.composeLineData(this.generalLine, false));
    this.lineChartColors.push(this.generalLine.composeColor());

    this.bucketLines.forEach(x => {
      this.lineChartData.push(this.composeLineData(x, true));
      this.lineChartColors.push(x.composeColor());
    });

    this.lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        // We use this empty structure as a placeholder for dynamic theming.
        xAxes: [{}],
        yAxes: [{
          display: true,
          ticks: {
            suggestedMax: 100,
            callback: (value) => value + (this.selectedTrendType === 'pass-rate' ? '%' : '')
          }
        }
        ]
      },
      annotation: {
        annotations: [
          {
            type: 'line',
            mode: 'vertical',
            scaleID: 'x-axis-0',
            value: 'March',
            borderColor: 'orange',
            borderWidth: 2,
            label: {
              enabled: true,
              fontColor: 'orange',
              content: 'LineAnno'
            }
          },
        ],
      },
    };
  }

  composeLineData(line: LineData, hidden: boolean): IPassRate {
    switch (this.selectedTrendType) {
      case "pass-rate": return line.composePassRate(this.labels, hidden);
      case "total-tests": return line.composeTotalTests(this.labels, hidden);
      default: console.error(`unknown trend type ${this.selectedTrendType}`);
    }
  }
}
