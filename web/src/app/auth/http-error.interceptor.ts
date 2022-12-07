import {Injectable} from "@angular/core";
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {AuthService} from "./auth.service";
import {Observable, throwError} from "rxjs";
import { catchError } from 'rxjs/operators';
import {config} from "../app.config";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(catchError(err => {

      if (!config.auth.accessTokenExcludeApi.find(x => request.url.startsWith(x)) && err.status === 401) {
        // auto logout if 401 response returned from api
        console.warn("http error interceptor found unauthorized call -> logging out the user");
        this.authService.logout();
      }

      const error = err.error.message || err.statusText;
      return throwError(error);
    }))
  }
}