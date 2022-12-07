import {Injectable} from "@angular/core";
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {AuthService} from "./auth.service";
import {config} from "../app.config";
import {Observable} from "rxjs";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

   constructor(private authService: AuthService) {}

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        let authReq = req;

        if (!config.auth.accessTokenExcludeApi.find(x => req.url.startsWith(x))) {
          authReq = req.clone({
              headers: req.headers.set('Authorization', 'JWT ' + this.authService.accessToken)
          });
        }

        // send cloned request with header to the next handler.
        return next.handle(authReq);
    }
}