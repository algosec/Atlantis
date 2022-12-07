import log from '../../shared/src/utils/log';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as userAgent from 'express-useragent';
import * as http from 'http';
import config from './config';
import {localRouter} from "./passport/local.login";
import {ssoSamlRouter} from "./passport/sso-saml.login";
import {jwtRouter} from "./controllers/jwt";
import {controllersRouter} from "./controllers/controllers";
import {Server} from "http";
import {configureJwtPassport} from "../../shared/src/auth/authentication";
import {findRevokedSessions} from "./services/dao";
import {initSettings} from "../../shared/src/settings/settings";
import {defaultErrorHandler} from "../../shared/src/utils/async-error-middleware";

export function validateConfiguration(): boolean {
    if (config.refreshToken.expirationSeconds <= config.jwt.expirationSeconds) {
        log.error(`Invalid configuration - config.refreshToken.expirationSeconds (${config.refreshToken.expirationSeconds}) must be larger than config.jwt.expirationSeconds (${config.jwt.expirationSeconds})`);
        return false;
    }

    return true;
}

export async function createServer(): Promise<Server> {
    const app = express();

    // server configuration
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(userAgent.express());
    app.use(express.urlencoded({extended: true}));

    // configure all authentication strategies
    require('./passport/local.login');
    require('./passport/sso-saml.login');
    configureJwtPassport(config.jwt.key.publicKey, await findRevokedSessions());

    initSettings();

    // ping controller - check that the server is alive
    app.get('/ping', (req, res) => res.send(config.express.serverName));

    // server API
    app.use(localRouter);
    app.use(ssoSamlRouter);
    app.use(jwtRouter);
    app.use(controllersRouter);

    // default error handler
    app.use(defaultErrorHandler);

    return http.createServer(app);
}
