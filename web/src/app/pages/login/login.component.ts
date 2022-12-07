import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../auth/auth.service";
import {ActivatedRoute, Router} from "@angular/router";
import {environment} from "../../../environments/environment";
import {globalConfig} from "../../../../../shared/src/globalConfig"

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    tenantId: string;
    tenantName = globalConfig.tenantDetails.tenantName

    returnUrl: string;

    username: string;
    password: string;
    isLoading = false;

    error: string;

    constructor(private authService: AuthService,
                private router: Router,
                private route: ActivatedRoute) { }

    ngOnInit(): void {
      this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
      this.tenantId = this.route.snapshot.params.tenantId;

      if (this.authService.isLoggedIn()) {
          console.debug(`user is already logged in -> redirecting back to ${this.returnUrl}`);
          this.router.navigate([this.returnUrl]);
          return;
      }

      if (environment.production && !globalConfig.localLogin.allowInProduction && this.route.snapshot.queryParams['forceLocalAuth'] != "1") {
          this.router.navigate(["/login/"+ globalConfig.tenantDetails.tenantId]);
          return;
      }
    }

    performLogin(): void {
      if(this.isLoading) {
        return;
      }

      this.isLoading = true;
      this.authService.login(this.username, this.password)
        .then(_res => this.router.navigate([this.returnUrl]))
        .catch(error => this.error = this.calculateErrorMessage(error))
        .finally(() => this.isLoading = false);
    }

  proceedWithSso(): void {
    this.router.navigate(["/login", this.tenantId, "sso"]);
  }

  calculateErrorMessage(error: string): string {
    if (error === "Unauthorized") {
      return "Sorry, credentials are incorrect";
    }

    console.error(error);
    return error;
  }
}
