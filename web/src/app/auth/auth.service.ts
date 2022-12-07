import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {config} from "../app.config";
import {Router} from "@angular/router";
import {ClientStorageService} from "../utils/client-storage.service";
import {IAccessTokenPayload, IRefreshTokenResponse, IUserInfo, Role} from "../../../../shared/src/auth/model";
import {calculateAccessTokenExpiresIn, extractPayloadFromAccessToken, extractTenantIdFromAccessToken} from "../../../../shared/src/auth/access-token-utils";

declare let pendo: {
    clearSession();
    isReady();
    initialize(options: unknown);
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

    // this field should be access using the get/set methods ONLY!
    private _accessToken: string;

    private accessTokenPayload: IAccessTokenPayload;
    private isOneTimeTokenWithoutRefreshToken = false;
    private refreshTokenTimeout;
    private currentUserSubject: BehaviorSubject<IUserInfo>;
    public currentUser: Observable<IUserInfo>;
    private pendoInitInterval: number;

    constructor(private http: HttpClient,
                private router: Router,
                private clientStorageService: ClientStorageService) {
        this.loadOneTimeAccessToken();
        this.currentUserSubject = new BehaviorSubject<IUserInfo>(null);
        this.currentUser = this.currentUserSubject.asObservable();
        this.currentUser.subscribe(x => this.initPendoAgent(x));
    }

    public get accessToken(): string {
        return this._accessToken;
    }

    public set accessToken(accessToken: string) {
        this._accessToken = accessToken;
        this.accessTokenPayload = extractPayloadFromAccessToken(this.accessToken);
    }

    public get currentUserValue(): IUserInfo {
        return this.currentUserSubject.value;
    }

    public isLoggedIn(): boolean {
        return !!this.accessToken;
    }

    public isAdmin(): boolean {
        return this.isLoggedIn() && this.accessTokenPayload?.roles.includes(Role.Admin);
    }

    // this is used in export to PDF, where the server sets this session storage parameter
    private loadOneTimeAccessToken(): void {
        const value = this.clientStorageService.getFromSessionStorage<string>('ONE_TIME_ACCESS_TOKEN');
        if (value) {
            console.debug('found one-time access token');
            this.clientStorageService.deleteFromSessionStorage('ONE_TIME_ACCESS_TOKEN');
            this.accessToken = value;
            this.isOneTimeTokenWithoutRefreshToken = true;
            this.clearLogoutFlag();
        }
    }

    public login(user: string, pass: string): Promise<void> {
        // upon successful login, it set the refresh token cookie, and this call will use it to obtain the access token.
        return this.http.post<void>(`${config.baseUrlAuth}/login/local`, { user, pass })
            .toPromise()
            .then(() => this.refreshToken(true));
    }

    public logout(skipRedirect?: boolean): void {
        const lastTenantId = extractTenantIdFromAccessToken(this.accessToken);

        this.clientStorageService.persistToLocalStorage<boolean>(config.auth.logoutFlag, true);
        this.currentUserSubject.next(null);
        this.accessToken = null;
        this.stopRefreshTokenTimer();

        this.http.delete<void>(`${config.baseUrlAuth}/jwt/refresh-token`, {withCredentials: true})
            .toPromise();

        // finally - redirect to login page if needed
        if (skipRedirect !== true) {
            const redirectPath = ['/login'];
            if (lastTenantId) {
                redirectPath.push(lastTenantId);
            }
            this.router.navigate(redirectPath);
        }
    }

    private loadUserDetails(): Promise<void> {
        return this.http.get<IUserInfo>(`${config.baseUrlAuth}/user`)
            .toPromise()
            .then((response: IUserInfo) => this.currentUserSubject.next(response));
    }

    private refreshToken(logoutOnFailure: boolean): Promise<void> {
        let basePromise: Promise<void>;

        if (this.isOneTimeTokenWithoutRefreshToken) {
            console.debug('skipped refresh token');
            basePromise = Promise.resolve();
        } else {
            console.debug(`Going to refresh token`);
            basePromise = this.http.post<IRefreshTokenResponse>(`${config.baseUrlAuth}/jwt/refresh-token`, null, {withCredentials: true})
                .toPromise()
                .then((response: IRefreshTokenResponse) => {
                    this.accessToken = response.accessToken;
                    this.scheduleNextRefreshToken(this.calculateNextRefreshTokenOperation());
                    this.clearLogoutFlag();
                });
        }

        // load user details if they're not loaded yet
        if (!this.currentUserValue) {
            basePromise = basePromise.then(() => this.loadUserDetails());
        }

        // anyway, load the user details at the end.
        return basePromise.catch(error => {
            if (logoutOnFailure || error === 'Unauthorized') {
                console.warn("refresh token was denied -> logging out the user")
                this.logout();
            } else {
                console.error('failed to refresh token - will try in short interval', error);
                this.scheduleNextRefreshToken(config.auth.jwt.refreshTokenDecrementsSeconds);
            }
        });
    }

    public clearLogoutFlag(): void {
        this.clientStorageService.deleteFromLocalStorage(config.auth.logoutFlag);
    }

    public refreshTokenIfNotLogout(): Promise<void> {
        return this.clientStorageService.getFromLocalStorage<boolean>(config.auth.logoutFlag)
            ? Promise.resolve()
            : this.refreshToken(true);
    }

    private scheduleNextRefreshToken(seconds: number): void {
        if (this.isOneTimeTokenWithoutRefreshToken) {
            return;
        }

        if (seconds < 0) {
            console.debug(`warning: changed seconds to ${config.auth.jwt.refreshTokenDecrementsSeconds} since it got negative number ${seconds}`);
            seconds = config.auth.jwt.refreshTokenDecrementsSeconds;
        }

        console.debug(`Scheduled refresh token in ${seconds} seconds`);
        this.stopRefreshTokenTimer();
        this.refreshTokenTimeout = setTimeout(() => this.refreshToken(false), seconds * 1000);
    }

    private stopRefreshTokenTimer(): void {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
        }
    }

    private calculateNextRefreshTokenOperation(): number {
        return calculateAccessTokenExpiresIn(this.accessToken) - config.auth.jwt.refreshTokenBeforeSeconds;
    }

    /** Integration with Pendo.io analytics tool.
     *  see https://www.pendo.io/
     */
    private initPendoAgent(user: IUserInfo) {
        clearTimeout(this.pendoInitInterval);

        // Pendo agent loads async, so its object might not have initialized yet,
        // so if it not loaded yet, try after a short while
        if (!pendo?.isReady) {
            console.debug("pendo agent not loaded yet, retry later");
            this.pendoInitInterval = setTimeout(() => this.initPendoAgent(user), 50);
            return;
        }

        // clear existing session if exists
        if (pendo.isReady()) {
            pendo.clearSession();
        }

        if (!user) {
            return;
        }

        console.debug("init pendo agent");
        pendo.initialize({
            visitor: {
                id: user.id,
                email: user.username,
                full_name: user.displayName
            },
            account: {
                id: extractTenantIdFromAccessToken(this.accessToken)
            }
        });
    }
}
