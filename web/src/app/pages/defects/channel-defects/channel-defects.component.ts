import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppStateService} from "../../../app-state.service";
import {IDefectFailures, ITeam, IBucket} from "../../../../../../shared/src/model";
import {Subscription} from "rxjs";
import {DateTimeService} from "../../../utils/date-time.service";
import {calculateAvailableBuckets} from "../../../utils/buckets";
import {ChannelDefectsPipe} from "./channel-defects.pipe";
import {Sort} from '@angular/material/sort';
import {ClientStorageService} from "../../../utils/client-storage.service";

interface IChannelDefectStorage {
    version: string;
    bucket: string;
    searchText: string ;
}

@Component({
    selector: 'app-channel-defects',
    templateUrl: './channel-defects.component.html',
    styleUrls: ['./channel-defects.component.css']
})
export class ChannelDefectsComponent implements OnInit, OnDestroy {
    isLoading: boolean;

    teams: ITeam[] = [];
    allBuckets: IBucket[];
    availableBuckets: IBucket[] = [];
    subscriptions: Subscription[] = [];

    defects: IDefectFailures[] = [];
    selectedVersion: ITeam;
    selectedBucket = 'All';
    searchText = '';

    filteredTotal: number;
    productBugs: number;
    autoBugs: number;

    constructor(private appStateService: AppStateService,
                private clientStorageService: ClientStorageService,
                public dateTimeService: DateTimeService,
                private channelDefectsPipePipe: ChannelDefectsPipe) { }

    ngOnInit(): void {
        this.isLoading = true;
        this.appStateService.loadTeams()
            .then(res => this.onTeamsLoad(res))
            .catch(err => {
                this.appStateService.showErrorLoadingToast(err)
                this.isLoading = false;
            });
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(s => s.unsubscribe());
    }

    onTeamsLoad(teams: ITeam[]): void {
        this.teams = teams;
        this.loadUserSavedState();
        this.allBuckets = this.teams[0].buckets
    }

    changeVersion(version: string): void {
        if (this.teams.length == 0) {
          return;
        }

        const filteredArray = this.teams.filter(v => v.version === version);
        this.selectedVersion = (filteredArray.length === 0) ? null : filteredArray[0];
        this.allBuckets = this.selectedVersion.buckets
        this.loadDefects();
    }

    loadDefects(): void {
        this.isLoading = true;
        this.appStateService.loadDefectsForVersion(this.selectedVersion.version)
            .then(res => this.onDefectsLoad(res))
            .catch(err => this.appStateService.showErrorLoadingToast(err))
            .finally(() => this.isLoading = false);
    }

    onDefectsLoad(res : IDefectFailures[]): void {
        const allTitles = res.flatMap(x => x.channels).map(x => x.title);
        this.availableBuckets = calculateAvailableBuckets(this.allBuckets, allTitles);
        this.defects = res.sort((a,b) => b.channels.length - a.channels.length);
        this.afterSearchUpdate();
    }

    resetSearch(): void {
        this.selectedBucket = 'All';
        this.searchText = '';
        this.afterSearchUpdate();
    }

    afterSearchUpdate(): void {
        this.selectedBucket = this.availableBuckets.some(x => x.title === this.selectedBucket) ? this.selectedBucket : 'All';
        this.calculateSearchTotals();
        this.persistUserSavedState();
    }

    calculateSearchTotals(): void {
        const filteredResults: IDefectFailures[] = this.channelDefectsPipePipe.transform(this.defects, this.selectedBucket, this.searchText, this.allBuckets);
        this.filteredTotal = filteredResults.length;
        this.productBugs = filteredResults.filter((obj) => obj.issueType === "Bug").length;
        this.autoBugs = filteredResults.filter((obj) => obj.issueType === "AutoBug").length;
    }

    loadUserSavedState(): void {
        const dataFromStorage: Partial<IChannelDefectStorage> = this.clientStorageService.getFromSessionStorage<IChannelDefectStorage>('channels-defects');

        this.selectedBucket = dataFromStorage?.bucket || 'All';
        this.searchText = dataFromStorage?.searchText || '';
        this.changeVersion(dataFromStorage?.version || this.teams[0]?.version);
    }

    persistUserSavedState(): void {
        this.clientStorageService.persistToSessionStorage<IChannelDefectStorage>('channels-defects', {
            version: this.selectedVersion.version,
            bucket: this.selectedBucket,
            searchText: this.searchText
        });
    }

    sortData(sort: Sort): void {
        const data = this.defects.slice();
        if (!sort.active || sort.direction === '') {
            this.defects = data;
            return;
        }

        this.defects = data.sort((a, b) => {
            const isAsc = sort.direction === 'asc';
            switch (sort.active) {
                case 'defect': return compare(a.id, b.id, isAsc);
                case 'severity': return compare(a.severity, b.severity, isAsc);
                case 'created': return compare(a.created, b.created, isAsc);
                case 'lastUpdated': return compare(a.lastUpdate, b.lastUpdate, isAsc);
                case 'assignee': return compare(a.assignee, b.assignee, isAsc);
                case 'summary': return compare(a.summary, b.summary, isAsc);
                case 'channels': return compare(a.channels.length, b.channels.length, isAsc);
                default: return 0;
            }
        });
    }
}

function compare(a: number | string | Date, b: number | string | Date, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
