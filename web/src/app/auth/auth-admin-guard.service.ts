import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {AuthService} from "./auth.service";

@Injectable({ providedIn: 'root' })
export class AuthAdminGuard implements CanActivate {
  constructor(
    private router: Router,
    private authenticationService: AuthService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    if (this.authenticationService.isAdmin()) {
      return true;
    }

    console.warn(`user is not permitted for ${route.url} -> redirecting to home page`);
    this.router.navigate(['/']);
    return false;
  }
}