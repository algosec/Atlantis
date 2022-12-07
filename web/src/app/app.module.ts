import {APP_INITIALIZER, NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import { RouterModule, Routes} from "@angular/router";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {MatTableModule} from '@angular/material/table';
import {MatSortModule} from '@angular/material/sort';

import { ToastrModule } from 'ngx-toastr';
import { ChartsModule } from 'ng2-charts';

import { AppComponent } from './app.component';
import { ChannelsComponent } from './pages/channels/channels.component';
import { ChannelFilterPipe } from "./pages/channels/channel-filter.pipe";
import { SearchBarComponent } from './utils/search-bar/search-bar.component';
import { DefectIconDirective } from './utils/defect-link/defect-icon.directive';
import { SearchKeyboardHookDirective } from './utils/search-keyboard-hook.directive';
import { EmailToDisplayNamePipe } from './utils/email-to-display-name.pipe';
import { ConfigureChannelsFilterPipe } from './pages/configure-channels/configure-channels-filter.pipe';
import { ChannelComponent } from './pages/channel/channel.component';
import { SimpleHeaderComponent } from './utils/simple-header/simple-header.component';
import { CardSummaryComponent } from './utils/card-summary/card-summary.component';
import { JobBuildStatusComponent } from './utils/job-build-status/job-build-status.component';
import { DefectLinkComponent } from './utils/defect-link/defect-link.component';
import { ChatLinkComponent } from './utils/chat-link/chat-link.component';
import { DefectsTableComponent } from './utils/defects-table/defects-table.component';
import { OrphanDefectsComponent } from './pages/defects/orphan-defects/orphan-defects.component';
import { ConfigureChannelsComponent } from './pages/configure-channels/configure-channels.component';
import { CompareBuildsComponent } from './pages/compare-builds/compare-builds.component';
import { ChannelBranchFilterPipe } from './pages/channel/channel-branch-filter.pipe';
import { BuildResultsComponent } from './pages/dashboards/build-results/build-results.component';
import { ConfigureBranchesComponent } from './pages/configure-branches/configure-branches.component';
import { BuildSelectorComponent } from './utils/build-selector/build-selector.component';
import { BranchTrendComponent } from './pages/dashboards/branch-trend/branch-trend.component';
import { DashboardsComponent } from './pages/dashboards/dashboards.component';
import {DefectsComponent} from "./pages/defects/defects.component";
import {ChannelDefectsComponent} from "./pages/defects/channel-defects/channel-defects.component";
import { AttachDefectComponent } from './utils/attach-defect/attach-defect.component';
import { ConfigureBranchesFilterPipe } from './pages/configure-branches/configure-branches-filter.pipe';
import { ChannelDefectsPipe } from './pages/defects/channel-defects/channel-defects.pipe';
import {AuthInterceptor} from "./auth/http-auth.interceptor";
import {AuthGuard} from "./auth/auth.guard";
import {AuthAdminGuard} from "./auth/auth-admin-guard.service";
import { LoginComponent } from './pages/login/login.component';
import {ErrorInterceptor} from "./auth/http-error.interceptor";
import {AuthService} from "./auth/auth.service";
import {AuthAppInitializer} from "./auth/auth.app.initializer";
import { AdminComponent } from './pages/admin/admin.component';
import { ActiveSessionsComponent } from './pages/admin/active-sessions/active-sessions.component';
import { LoginSsoRedirectComponent } from './pages/login/login-sso-redirect/login-sso-redirect.component';
import {DefectFilter} from "./pages/channel/defect-filter.pipe";
import { PageNotImplementedComponent } from './pages/page-not-implemented/page-not-implemented.component';

const appRoutes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'login/:tenantId', component: LoginComponent },
    { path: 'login/:tenantId/sso', component: LoginSsoRedirectComponent },
    { path: '', canActivate:[AuthGuard], children: [
        { path: 'channels/:version', children: [
                { path: '', redirectTo: 'master', pathMatch: 'full' },
                { path: 'configure', component: ConfigureChannelsComponent },
                { path: 'branches', component: ConfigureBranchesComponent },
                { path: ':branch', component: ChannelsComponent },
                { path: ':branch/:channel', component: ChannelComponent }
            ]
        },
        { path: 'dashboards', component: DashboardsComponent, children: [
                { path: '', redirectTo: 'build-results', pathMatch: 'full' },
                { path: 'build-results', component: BuildResultsComponent },
                { path: 'build-results/:branch/:build', component: BuildResultsComponent },
                { path: 'branch-trend', component: BranchTrendComponent },
                { path: 'branch-trend/:version/:branch', component: BranchTrendComponent }
            ]
        },
        { path: 'defects', component: DefectsComponent, children: [
                { path: '', redirectTo: 'channel-defects', pathMatch: 'full' },
                { path: 'channel-defects', component: ChannelDefectsComponent },
                { path: 'orphan-defects', component: OrphanDefectsComponent },
            ]
        },
        { path: 'compare-builds', component: CompareBuildsComponent },
        { path: 'compare-builds/:baselineBranch/:baselineBuild/:branch/:build', component: CompareBuildsComponent },
        { path: 'admin', canActivate:[AuthAdminGuard], component: AdminComponent, children: [
                { path: '', redirectTo: 'sessions', pathMatch: 'full' },
                { path: 'sessions', component: ActiveSessionsComponent },
                { path: 'api-keys', component: PageNotImplementedComponent },
                { path: 'users', component: PageNotImplementedComponent },
                { path: 'authentication', component: PageNotImplementedComponent },
                { path: 'integrations', component: PageNotImplementedComponent },
            ]
        },
        { path: '**', redirectTo: '/channels/latest/master' }
    ]}
];

const AppRouterModule = RouterModule.forRoot(appRoutes, {
  enableTracing: false // <-- debugging purposes only
});

@NgModule({
  imports:      [ BrowserModule, FormsModule, HttpClientModule, BrowserAnimationsModule, ToastrModule.forRoot(), AppRouterModule, ChartsModule, MatSortModule, MatTableModule],
  declarations: [ AppComponent, ChannelsComponent, ChannelFilterPipe, SearchBarComponent, DefectIconDirective, SearchKeyboardHookDirective, EmailToDisplayNamePipe, ConfigureChannelsFilterPipe, ChannelComponent, SimpleHeaderComponent, CardSummaryComponent, DefectLinkComponent, ChatLinkComponent, DefectsTableComponent, OrphanDefectsComponent, ConfigureChannelsComponent, ChannelBranchFilterPipe, BuildResultsComponent, CompareBuildsComponent, ConfigureBranchesComponent, BuildSelectorComponent, BranchTrendComponent, DashboardsComponent, JobBuildStatusComponent, DefectsComponent, ChannelDefectsComponent, AttachDefectComponent, ConfigureBranchesFilterPipe, ChannelDefectsPipe, LoginComponent, AdminComponent, ActiveSessionsComponent, LoginSsoRedirectComponent, DefectFilter, PageNotImplementedComponent ],
  providers:    [ ChannelFilterPipe, EmailToDisplayNamePipe, ConfigureChannelsFilterPipe, ChannelDefectsPipe,
        { provide: APP_INITIALIZER, useFactory: AuthAppInitializer, multi: true, deps: [AuthService] },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  ],
  bootstrap:    [ AppComponent ]
})
export class AppModule { }
