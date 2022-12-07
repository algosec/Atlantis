import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as userAgent from 'express-useragent';
import * as http from 'http';
import config from './config';
import {Server} from "http";
import {initSettings} from "../../shared/src/settings/settings";
import {controllersRouter} from "./controllers/controllers";
import {defaultErrorHandler} from "../../shared/src/utils/async-error-middleware";

export async function createServer(): Promise<Server> {
    const app = express();

    // server configuration
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(userAgent.express());
    app.use(express.urlencoded({extended: true}));

    initSettings()

    // ping controller - check that the server is alive
    app.get('/ping', (req, res) => res.send(config.express.serverName));

    // server API
    app.use(controllersRouter);

    // default error handler
    app.use(defaultErrorHandler);

    return http.createServer(app);
}
