import { Component, OnInit } from '@angular/core';
import {AuthService} from "../../../auth/auth.service";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-login-sso-redirect',
  template: '',
})
export class LoginSsoRedirectComponent implements OnInit {

  constructor(private authService: AuthService,
              private router: Router,
              private route: ActivatedRoute) { }

  ngOnInit(): void {
      // TODO: handle returnURL for SSO
      this.redirectToSso();
  }

  redirectToSso(): void {
    const tenantId: string = this.route.snapshot.params.tenantId;

    if (this.authService.isLoggedIn()) {
      console.log(`logout user before initiating SSO`);
      this.authService.logout(true);
    }

    console.log(`detected SSO for tenant ${tenantId} - redirecting to next hop`);
    this.authService.clearLogoutFlag();
    location.assign(`/api/auth/login/sso/${tenantId}`);
  }

}
