import {Component, OnInit, ViewChild} from '@angular/core';
import {AppStateService} from "../../../app-state.service";
import {DateTimeService} from "../../../utils/date-time.service";
import {ISessionInfo} from "../../../../../../shared/src/auth/model";
import * as parser from 'ua-parser-js';
import {MatSort, Sort} from "@angular/material/sort";

interface NameAndIcon {
    name: string;
    icon: string;
}

interface ISessionInfoWithUserAgent extends ISessionInfo {
    browser: NameAndIcon;
    os: NameAndIcon;
}

@Component({
  selector: 'app-active-sessions',
  templateUrl: './active-sessions.component.html',
  styleUrls: ['./active-sessions.component.css']
})
export class ActiveSessionsComponent implements OnInit {

  @ViewChild(MatSort) sort: MatSort;

  loadActiveSessions: ISessionInfoWithUserAgent[];
  isLoading = false;

  constructor(private appStateService: AppStateService,
              public dateTimeService: DateTimeService) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
      if (this.isLoading) {
          return;
      }
      this.isLoading = true;
      this.appStateService.loadActiveSessions()
          .then(x => this.extendWithUserAgentInfo(x))
          .then(x => this.loadActiveSessions = x)
          .then(() => this.initSort())
          .catch(err => this.appStateService.showErrorLoadingToast(err))
          .finally(() => this.isLoading = false);
  }

  extendWithUserAgentInfo(data: ISessionInfo[]): ISessionInfoWithUserAgent[] {
      return data.map(x => {
          const ua = parser(x.userAgent);
          return <ISessionInfoWithUserAgent> {
              ...x,
              browser: {
                  name: `${ua.browser.name} ${ua.browser.version}`,
                  icon: this.parseBrowserIcon(ua),
              },
              os: {
                  name: `${ua.os.name} ${ua.os.version}`,
                  icon: this.parseOperatingSystemIcon(ua),
              }
          }
      });
    }

    initSort(): void {
        const sortState: Sort = {active: 'user', direction: 'asc'};
        this.sort.active = sortState.active;
        this.sort.direction = sortState.direction;
        this.sort.sortChange.emit(sortState);
    }

    parseBrowserIcon(ua: parser.IResult): string {
        switch (ua.browser.name) {
            case "Chrome": return "fab fa-chrome";
            case "Firefox": return "fab fa-firefox";
            case "Safari": return "fab fa-safari";
            default: console.log(`unknown browser ${ua.browser.name}`); return "far fa-question-circle";
        }
    }

    parseOperatingSystemIcon(ua: parser.IResult): string {
        switch (ua.os.name) {
            case "Windows": return "fab fa-windows";
            case "Mac OS": return "fab fa-apple";
            default: console.log(`unknown operating system ${ua.os.name}`); return "far fa-question-circle";
        }
    }

    sortData(sort: Sort): void {
        const data = this.loadActiveSessions.slice();
        if (!sort.active || sort.direction === '') {
            this.loadActiveSessions = data;
            return;
        }

        this.loadActiveSessions = data.sort((a, b) => {
            const isAsc = sort.direction === 'asc';
            switch (sort.active) {
                case 'user': return compare(a.user.displayName, b.user.displayName, isAsc);
                case 'last-activity': return compare(a.lastActivity, b.lastActivity, isAsc);
                case 'created': return compare(a.created, b.created, isAsc);
                case 'ip-address': return compare(a.ipAddress, b.ipAddress, isAsc);
                case 'os': return compare(a.os.name, b.os.name, isAsc);
                case 'browser': return compare(a.browser.name, b.browser.name, isAsc);
                default: return 0;
            }
        });
    }
}

function compare(a: number | string | Date, b: number | string | Date, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
