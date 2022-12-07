import {Request} from "express";
import * as passport from "passport";
import {ExtractJwt, Strategy as JWTStrategy} from 'passport-jwt';
import config from "../config";
import {AccessToken, IAccessTokenPayload, IAccessTokenPayloadEnhanced, IRevokeAccessToken} from "./model";
import {subscribe} from "../services/redis";
import log from "../utils/log";
import * as moment from "moment";
import {Moment} from "moment";

export const REVOKE_ACCESS_TOKEN_CHANNEL = "REVOKE_ACCESS_TOKEN_CHANNEL";

export interface ExpressUser extends IAccessTokenPayload, Express.User {
    accessToken: AccessToken;
}

const revokedTokens = new Map<string, Moment>();

export function configureJwtPassport(publicKey: string, revokedSessions: IRevokeAccessToken[]): void {
    const extractJWTFromRequest = ExtractJwt.fromAuthHeaderWithScheme('JWT');
    passport.use(new JWTStrategy({
            jwtFromRequest: extractJWTFromRequest,
            secretOrKey: publicKey,
            algorithms: config.jwt.algorithms,
            passReqToCallback: true
        },
        (req: Request, jwtPayload: IAccessTokenPayloadEnhanced, cb: (err: string, user?: ExpressUser) => void) => {
            if (revokedTokens.has(jwtPayload.sub) && moment().isBefore(revokedTokens.get(jwtPayload.sub))) {
                cb(null, null); // reject the access token (although it's valid) as it has been revoked
                return;
            }
            cb(null, {
                ...jwtPayload,
                accessToken: extractJWTFromRequest(req)
            });
        }
    ));

    // setup revoked session - this is in order to load all the revoked sessions,
    // that happened before this micro-service instance was started
    revokedTokens.clear();
    revokedSessions.forEach(x => revokedTokens.set(x.id, moment(x.expiration)));
    log.info(`cleanupRevokedTokens initialized with ${revokedTokens.size} records`);

    // register to get notified when another session has been revoked
    subscribe(REVOKE_ACCESS_TOKEN_CHANNEL, handleRevokeAccessTokenEvent);
}

function handleRevokeAccessTokenEvent(message: IRevokeAccessToken) {
    log.debug(`setting revoked access token ${message.id} to ${message.expiration}`);
    revokedTokens.set(message.id, moment(message.expiration));
}

setInterval(cleanupRevokedTokens, config.jwt.revokedTokenCleanupIntervalSeconds * 1000);

function cleanupRevokedTokens() {
    log.debug(`cleanupRevokedTokens started (${revokedTokens.size} records)`);
    const currentTime = moment();
    Array.from(revokedTokens.keys())
        .filter(key => {
            log.silly(`compare ${key} expiration ${revokedTokens.get(key)} to ${currentTime}`);
            return revokedTokens.get(key).isBefore(currentTime);
        })
        .forEach(key => {
            log.debug(`cleanup revoked token ${key}`);
            revokedTokens.delete(key);
        });
    log.debug(`cleanupRevokedTokens finished (${revokedTokens.size} records)`);
}

export function fetchUser(req: Request): ExpressUser {
    return <ExpressUser> req.user;
}