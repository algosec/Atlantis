import log from '../../shared/src/utils/log';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as userAgent from 'express-useragent';
import {Server as SocketIoServer} from 'socket.io';
import * as http from 'http';
import * as passport from "passport";
import {router} from './controllers/api';
import config from './config';
import {Server} from "http";
import {initSettings} from "../../shared/src/settings/settings";
import {defaultErrorHandler} from "../../shared/src/utils/async-error-middleware";
import {globalConfig} from "../../shared/src/globalConfig";

export function createServer(): Server {
    const app = express();

    // server configuration
    app.use(bodyParser.json({limit: '256kb'}));
    app.use(cookieParser());
    app.use(userAgent.express());
    app.use(express.urlencoded({extended: true}));

    initSettings();

    // ping controller - check that the server is alive
    app.get('/ping', (req, res) => res.send(config.express.serverName));

    // server API
    app.use((req, res, next) => {
        // temporary until we will implement access tokens
        if (req.url.includes("/notification") && !req.headers['Authorization']) {
        const placeholderJWT = config.isProduction ? globalConfig.JWTAllureToken.production : globalConfig.JWTAllureToken.nonProduction;
            log.warn("workaround - setting token for notification request");
            req.headers['authorization'] = placeholderJWT;
        }
        passport.authenticate('jwt', {session: false})(req, res, next);
    }, router);

    // default error handler
    app.use(defaultErrorHandler);

    const server = http.createServer(app);

    const io = new SocketIoServer(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', socket => {
        log.info(`socket.io -> connect ${socket.id} (${socket.handshake.address})`);

        socket.on('disconnect', () => {
            log.info(`socket.io -> disconnect ${socket.id} (${socket.handshake.address})`);
        });
    });

    return server;
}
