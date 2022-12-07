import {Injectable} from '@angular/core';
import {Observable, Subject, Subscriber} from "rxjs";
import {config} from "./app.config";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {IndividualConfig, ToastrService} from "ngx-toastr";
import { io } from 'socket.io-client';
import {
  IChannelSetupInfo,
  IChannelExtendedSummary,
  IChannelLatestSummary,
  IDefect,
  ITeam,
  ICardBuildSummary,
  IBranchExtendedSummary,
  IBuildsByBranchByTeam,
  IBuildTrendItem,
  IDefectFailures,
  DefaultRestResponse,
  IChannelToDefect,
  IBuildCountByChannel,
  IChannelsOwners
} from "../../../shared/src/model";
import {Socket} from "socket.io-client/build/socket";
import {ISessionInfo} from "../../../shared/src/auth/model";

@Injectable({
  providedIn: 'root'
})
export class AppStateService {

  syncRequestObserver: Subscriber<void>;
  syncRequestObservable: Observable<void>;

  escapeKeyPressBroadcastSubject: Subject<void>;
  escapeKeyPressObservable: Observable<void>;

  private toastSettings: Partial<IndividualConfig> = {
    closeButton: true,
    progressBar: true,
    progressAnimation: "increasing",
    timeOut: 10000,
    extendedTimeOut: 5000,
    enableHtml: true
  };

  teamsCache: ITeam[];
  buildsByBranchByTeam: IBuildsByBranchByTeam[];

  buildCountByChannel: IBuildCountByChannel[];

  socket: Socket;

  constructor(private http: HttpClient, private toastr: ToastrService) {
    this.syncRequestObservable = new Observable<void>(observer => this.syncRequestObserver = observer);
    this.escapeKeyPressBroadcastSubject = new Subject<void>();
    this.escapeKeyPressObservable = this.escapeKeyPressBroadcastSubject.asObservable();

    //this.connectSocketIO();
  }

  connectSocketIO(): void {
    this.socket = io(config.baseUrl);

    this.socket.on("connect", () => {
      console.log(`socket.io -> connect ${this.socket.id}`);
    });

    this.socket.on("disconnect", () => {
      console.log(`socket.io -> disconnected`);
    });

    this.socket.on("error", (_e) => {
      console.log(`socket.io -> error ${this.socket.id}`); // undefined
    });

    this.socket.connect();
  }

  private disconnectSocketIO() {
    this.socket.disconnect();
  }

  triggerSyncDefects(): Promise<void> {
    return this.http.post<void>(`${config.baseUrl}/sync/jira`, null)
        .toPromise<void>()
        .then(() => this.syncRequestObserver && this.syncRequestObserver.next());
  }

  loadTeams(): Promise<ITeam[]> {
    if (this.teamsCache) {
      return Promise.resolve(this.teamsCache);
    }
    return this.http.get<ITeam[]>(`${config.baseUrl}/teams`)
        .toPromise()
        .then(res => this.teamsCache = res);
  }

  loadChannelsSummary(teamId: string, branch: number): Promise<IChannelLatestSummary[]> {
    return this.http.get<IChannelLatestSummary[]>(`${config.baseUrl}/teams/${teamId}/${branch}/summary`)
        .toPromise();
  }

  loadChannelOwners(version: string): Promise<IChannelsOwners[]> {
    return this.http.get<IChannelsOwners[]>(`${config.baseUrl}/teams/${version}/channels/owners`)
        .toPromise();
  }

  loadBranchTrend(branch: number): Promise<IBuildTrendItem[]> {
    return this.http.get<IBuildTrendItem[]>(`${config.baseUrl}/branches/${branch}/trend`)
        .toPromise();
  }

  loadBuilds(): Promise<IBuildsByBranchByTeam[]> {
    if (this.buildsByBranchByTeam) {
      return Promise.resolve(this.buildsByBranchByTeam);
    }
    return this.http.get<IBuildsByBranchByTeam[]>(`${config.baseUrl}/builds-by-branch-by-team`)
        .toPromise()
        .then(res => this.buildsByBranchByTeam = res);
  }

  loadCountBuildPerChannel(build: string): Promise<IBuildCountByChannel[]> {
    return this.http.get<IBuildCountByChannel[]>(`${config.baseUrl}/count-reruns-by-build-by-channel/${build}`)
        .toPromise()
        .then(res => this.buildCountByChannel = res);
  }

  loadChannelsConfiguration(version: string): Observable<IChannelSetupInfo[]> {
    return this.http.get<IChannelSetupInfo[]>(`${config.baseUrl}/teams/${version}/channels/configuration`);
  }

  loadBranchesConfiguration(version: string): Observable<IBranchExtendedSummary[]> {
    return this.http.get<IBranchExtendedSummary[]>(`${config.baseUrl}/teams/${version}/branches/configuration`);
  }

  loadChannel(version: string, channel: string): Observable<IChannelExtendedSummary> {
    return this.http.get<IChannelExtendedSummary>(`${config.baseUrl}/channels/${version}/${channel}`);
  }

  loadDefectsGroupedByChannelForVersion(version: string): Promise<IChannelToDefect> {
    return this.http.get<IChannelToDefect>(`${config.baseUrl}/defects/${version}/channels`)
        .toPromise()
  }

  loadDefectsForVersion(version: string): Promise<IDefectFailures[]> {
    return this.http.get<IDefectFailures[]>(`${config.baseUrl}/defects/${version}`)
        .toPromise();
  }

  loadOrphanDefects(): Observable<IDefect[]> {
    return this.http.get<IDefect[]>(`${config.baseUrl}/orphan-defects`);
  }

  loadCardsByBranchAndBuild(branch: string, build: string): Promise<ICardBuildSummary[]> {
    return this.http.get<ICardBuildSummary[]>(`${config.baseUrl}/cards/${branch}/${build}`)
        .toPromise();
  }

  loadActiveSessions(): Promise<ISessionInfo[]> {
    return this.http.get<ISessionInfo[]>(`${config.baseUrlAuth}/sessions/active`)
        .toPromise();
  }

  submitSetOwners(type: 'channels'|'branches', resourcesIds: (string|number)[], owner: string): Promise<void> {
    return this.http.post<void>(`${config.baseUrl}/owners`, {
      type,
      resourcesIds,
      owner
    }).toPromise();
  }

  submitSetTitle(branch: number, newTitle: string): Promise<void> {
    return this.http.post<void>(`${config.baseUrl}/branches`, {
      branch,
      newTitle
    }).toPromise();
  }

  submitSetBranchArchived(branch: number, archived: boolean): Promise<void> {
    return this.http.post<void>(`${config.baseUrl}/branches`, {
      branch,
      archived
    }).toPromise();
  }

  submitSetChannelArchived(channel: string, archived: boolean): Promise<void> {
    return this.http.post<void>(`${config.baseUrl}/channels`, {
      channel,
      archived
    }).toPromise();
  }

  async linkDefectToChannel(channelId: string, defectId: string): Promise<DefaultRestResponse> {
    return this.http.put<DefaultRestResponse>(`${config.baseUrl}/channels/${channelId}/defects`, {defectId})
        .toPromise();
  }

  getSyncRequestObservable(): Observable<void> {
    return this.syncRequestObservable;
  }

  showErrorLoadingToast(err: HttpErrorResponse): void {
    console.error(err);
    const message = err?.error?.message || err?.message || 'Unknown error';
    this.showErrorToast(message);
  }

  showErrorToast(message: string): void {
    console.error(message);
    this.toastr.error(AppStateService.convertToasterMessageHtml(message), null, this.toastSettings);
  }

  showWarningToast(message: string): void {
    console.warn(message);
    this.toastr.warning(AppStateService.convertToasterMessageHtml(message), null, this.toastSettings);
  }

  showSuccessToast(message: string): void {
    console.info(message);
    this.toastr.success(AppStateService.convertToasterMessageHtml(message), null, this.toastSettings);
  }

  private static convertToasterMessageHtml(message: string): string {
    return message.replace(/\n/g, '<br/>');
  }

  getEscapeKeyPressedObservable(): Observable<void> {
    return this.escapeKeyPressObservable;
  }

  broadcastEscapeKeyPressed(): void {
    this.escapeKeyPressBroadcastSubject && this.escapeKeyPressBroadcastSubject.next();
  }

}
