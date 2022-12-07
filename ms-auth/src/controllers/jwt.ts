import config from "../config";
import {IAccessTokenWithRefreshToken} from "../model";
import {Router} from "express";
import {expireSession, performRefreshToken} from "../services/jwt";
import {asyncErrorMiddleware} from "../../../shared/src/utils/async-error-middleware";
import {setRefreshTokenCookie} from "../utils/set-refresh-token-cookie";
import {fetchClientIpAddress, fetchUserAgent} from "../../../shared/src/utils/express-request-information";
import {IAccessTokenPublicCertificate, IRefreshTokenResponse, IRevokeAccessToken, RefreshToken} from "../../../shared/src/auth/model";
import {publish} from "../../../shared/src/services/redis";
import {REVOKE_ACCESS_TOKEN_CHANNEL} from "../../../shared/src/auth/authentication";
import * as moment from "moment";

export const jwtRouter: Router = Router();

jwtRouter.get('/jwt/public-key', (req, res) => {
    const result: IAccessTokenPublicCertificate = {
        publicKey: config.jwt.key.publicKey,
    };
    res.json(result);
});

jwtRouter.post('/jwt/refresh-token', asyncErrorMiddleware(async (req, res) => {
    const refreshToken: RefreshToken = req.cookies[config.refreshToken.headerName];
    const result: IAccessTokenWithRefreshToken = await performRefreshToken(refreshToken, fetchUserAgent(req), fetchClientIpAddress(req));

    if (!result) {
        res.status(401).json({error: 'Unknown refresh token'});
        return;
    }

    const response: IRefreshTokenResponse = {accessToken: result.accessToken};

    setRefreshTokenCookie(res, result.refreshToken, result.expiration);
    res.json(response);
}));

jwtRouter.delete('/jwt/refresh-token', asyncErrorMiddleware(async (req, res) => {
    const refreshToken: RefreshToken = req.cookies[config.refreshToken.headerName];
    const expiration: Date = moment().add(config.jwt.expirationSeconds, 'second').toDate();
    const sessionId = await expireSession(refreshToken, expiration);

    if (sessionId) {
        // notify about the revoked session
        const event: IRevokeAccessToken = {
            id: sessionId,
            expiration: expiration,
        };
        await publish<IRevokeAccessToken>(REVOKE_ACCESS_TOKEN_CHANNEL, event);
    }

    setRefreshTokenCookie(res, '', moment().subtract(1, "minute").toDate());
    res.status(204).send();
}));