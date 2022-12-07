import {ChangeDetectorRef, Component, OnInit} from '@angular/core';

import {AppStateService} from "../../app-state.service";
import {
    IBuildsByBranchByTeam,
    ICardBuildSummary,
    IChannelsOwners,
    IDefect,
    ITeam
} from "../../../../../shared/src/model";
import {ActivatedRoute, ParamMap, Router} from "@angular/router";
import {DateTimeService} from "../../utils/date-time.service";

enum CompareFilter {
    All = "All",
    Different = "Different",
    Degradation = "Degradation",
    N_A = "N_A",
    Failures = "Failures"
}

interface IBuildCompare {
    build: string;
    branch: string;
    baseline: {
        build: string;
        branch: string;
    };
    majorVersion: string;
    mode: string;
}

@Component({
    selector: 'app-compare',
    templateUrl: './compare-builds.component.html',
    styleUrls: ['./compare-builds.component.css']
})

export class CompareBuildsComponent implements OnInit {

    teams: ITeam[];

    buildsByBranchByTeams: IBuildsByBranchByTeam[];

    build1Cards: Map<string, ICardBuildSummary> = new Map<string, ICardBuildSummary>();
    build2Cards: Map<string, ICardBuildSummary> = new Map<string, ICardBuildSummary>();

    channelsList: string[] = [];
    defectsByChannels: Map<string, IDefect[]>;

    compareFilter: string[] = Object.keys(CompareFilter);
    compare: IBuildCompare;

    ownerByChannelMap: Map<string, string> = new Map<string, string>();

    constructor(private appStateService: AppStateService,
                private router: Router,
                private route: ActivatedRoute,
                public dateTimeService: DateTimeService,
                private cdr: ChangeDetectorRef) {
    }
    
    ngOnInit(): void {
        this.appStateService.loadTeams()
            .then(res => this.onTeamsLoad(res))
            .catch(err => this.appStateService.showErrorLoadingToast(err));
    }

    onTeamsLoad(teams: ITeam[]): void {
        this.teams = teams;
        this.route.paramMap.subscribe((params: ParamMap) => {
            const tempBranch = params.get('branch');
            const tempBuild = params.get('build');
            this.compare = {
                branch: tempBranch,
                build: tempBuild,
                baseline: {
                    branch: params.get('baselineBranch') || '',
                    build: params.get('baselineBuild') || '',
                },
                majorVersion: tempBuild && tempBuild.match(/^(\d+\.\d+)/)[1],
                mode: CompareFilter.All
            };
            this.updateRoute();
        });


        Promise.all([this.appStateService.loadBuilds(), this.appStateService.loadChannelOwners(this.compare.majorVersion)])
            .then(res => this.onLoad(res[0], res[1]))
            .catch(err => this.appStateService.showErrorLoadingToast(err));
    }

    onLoad(res1: IBuildsByBranchByTeam[], res2: IChannelsOwners[]): void {
        this.buildsByBranchByTeams = res1;

        this.initOwner(res2);
        this.updateBuild(this.compare.baseline.branch, this.compare.baseline.build, 1);
        this.updateBuild(this.compare.branch, this.compare.build, 2);
    }

    updateRoute(): void {
        if (!this.compare.branch || !this.compare.build || !this.compare.baseline?.branch || !this.compare.baseline?.build) {
            return;
        }
        this.router.navigate(['/compare-builds', this.compare.baseline.branch, this.compare.baseline.build, this.compare.branch, this.compare.build]);
    }

    swapBuilds(): void {
        const originalBaselineBranch: string = this.compare.baseline.branch;
        const originalBaselineBuild: string = this.compare.baseline.build;
        const originalBranch: string = this.compare.branch;
        const originalBuild: string = this.compare.build;
        this.updateBuild(originalBranch, originalBuild, 1);
        this.updateBuild(originalBaselineBranch, originalBaselineBuild, 2);
    }

    updateBuild(branch: string, build: string, key: number): void {
        if (!branch || !build) {
            return;
        }

        const isOriginalBuild = key == 2;

        if (isOriginalBuild) {
            this.compare.branch = branch;
            this.compare.build = build;
        } else {
            this.compare.baseline = {
                build: build,
                branch: branch
            };
        }

        this.updateRoute();

        this.appStateService.loadCardsByBranchAndBuild(branch, build)
            .then(res => this.updateResult(res, key))
            .catch(err => this.appStateService.showErrorLoadingToast(err));

        if (isOriginalBuild) {
            this.compare.majorVersion = this.getVersion();
            this.appStateService.loadChannelOwners(this.compare.majorVersion)
                .then(res => this.updateOwnerResult(res))
                .catch(err => this.appStateService.showErrorLoadingToast(err));
            this.loadDefects();
        }

        this.cdr.detectChanges();
    }

    private updateOwnerResult(res: IChannelsOwners[]): void {
        this.initOwner(res);
    }

    private updateResult(res: ICardBuildSummary[], key: number) {
        key == 1 ? this.build1Cards = new Map(res.map(i => [i.channelTitle, i])) : this.build2Cards = new Map(res.map(i => [i.channelTitle, i]));
        this.channelsList = Array.from(this.build1Cards.keys()).concat(Array.from(this.build2Cards.keys()));
        this.channelsList = Array.from(new Set(this.channelsList)).sort();
    }

    public loadDefects(): void {
        this.appStateService.loadDefectsGroupedByChannelForVersion(this.compare.majorVersion)
            .then(res => this.defectsByChannels = new Map(Object.entries(res)))
            .catch(err => this.appStateService.showErrorLoadingToast(err));
    }

    checkEqual(channel: string): boolean {
        const cardA = this.build1Cards.get(channel);
        const cardB = this.build2Cards.get(channel);

        if (cardA && cardB) {
            return cardA.passed === cardB.passed && cardA.failed === cardB.failed && cardA.skipped === cardB.skipped;
        }
        return false;
    }

    checkDegradation(channel: string): boolean {
        const cardA = this.build1Cards.get(channel);
        const cardB = this.build2Cards.get(channel);

        if (cardA && cardB) {
            return this.calculatePercentage(cardA.passed, cardA.skipped, cardA.failed) > this.calculatePercentage(cardB.passed, cardB.skipped, cardB.failed);
        }
        return false;
    }

    updateFilter(filter: string): void {
        this.compare.mode = filter;
        this.updateRoute();
    }

    toShow(channel: string): boolean {
        switch (this.compare.mode) {
            case CompareFilter.All:
                return true;
            case CompareFilter.Different:
                return !this.checkEqual(channel);
            case CompareFilter.Degradation:
                return this.checkDegradation(channel);
            case CompareFilter.N_A:
                return this.build2Cards.get(channel) === undefined ;
            case CompareFilter.Failures:
                if(this.build2Cards.get(channel)) {
                    return this.build2Cards.get(channel).failed > 0;
                }
        }
        return false;
    }

    calculatePercentage(passed: number, skipped: number, failed: number): number {
        const res = Math.floor((passed / (passed + skipped + failed)) * 100);
        return isNaN(res) ? 0 : res;
    }

    calculateTrendClass(channel: string): string {
        const cardA = this.build1Cards.get(channel);
        const cardB = this.build2Cards.get(channel);

        if (cardA && cardB) {
            const cardAPercentage = this.calculatePercentage(cardA.passed, cardA.skipped, cardA.failed);
            const cardBPercentage = this.calculatePercentage(cardB.passed, cardB.skipped, cardB.failed);
            if (cardAPercentage < cardBPercentage) {
                return "pass";
            } else if (cardAPercentage > cardBPercentage) {
                return "fail";
            }
        }
        return "";
    }

    calculateTrend(channel: string): string {
        const cardA = this.build1Cards.get(channel);
        const cardB = this.build2Cards.get(channel);
        if (cardA && cardB) {
            const cardAPercentage = this.calculatePercentage(cardA.passed, cardA.skipped, cardA.failed);
            const cardBPercentage = this.calculatePercentage(cardB.passed, cardB.skipped, cardB.failed);
            const diff = cardBPercentage - cardAPercentage;


            if (diff === 0) {
                return '';
            }
            return `${diff}% (${cardB.passed - cardA.passed})`;
        }
        return "";
    }

    private initOwner(res: IChannelsOwners[]): void {
        res.forEach(y => this.ownerByChannelMap.set(y.title,y.owner));
    }

    private getVersion(): string {
        return this.compare.build && this.compare.build.match(/^(\d+\.\d+)/)[1];
    }
}
