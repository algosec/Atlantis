import config from "../config";
import {IAccessTokenWithRefreshToken, IRefreshTokenWithExpiration} from "../model";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';
import {hashData} from "../utils/hash-string";
import {createSession, expireSessionByRefreshToken, findSessionByRefreshToken, ISessionByRefreshToken, refreshSession} from "./dao";
import {AccessToken, IAccessTokenPayload, RefreshToken} from "../../../shared/src/auth/model";
import * as moment from "moment";

// generate a signed son web token with the contents of user object and return it in the response
export function generateAccessToken(payload: IAccessTokenPayload, sessionId: string): AccessToken {
    return jwt.sign(payload, config.jwt.key.privateKey, {
        algorithm: config.jwt.algorithm,
        expiresIn: config.jwt.expirationSeconds,
        issuer: config.jwt.issuer,
        subject: sessionId,
    });
}

export async function registerRefreshToken(tenantId: string, userId: string, userAgent: string, ipAddress: string): Promise<IRefreshTokenWithExpiration> {
    const refreshToken = uuidv4();
    const expiration = moment().add(config.refreshToken.expirationSeconds, 'second').toDate();
    if (! await createSession(tenantId, userId, expiration, userAgent, ipAddress, hashData(refreshToken))) {
        return null;
    }
    return {
        refreshToken,
        expiration,
    };
}

export async function performRefreshToken(refreshToken: RefreshToken, userAgent: string, ipAddress: string): Promise<IAccessTokenWithRefreshToken> {
    if (!refreshToken) {
        return null;
    }

    const refreshTokenHash = hashData(refreshToken);
    const newRefreshToken = uuidv4();
    const newRefreshTokenHash = hashData(newRefreshToken);

    if (! await refreshSession(refreshTokenHash, newRefreshTokenHash, config.refreshToken.expirationSeconds, userAgent, ipAddress)) {
        return null;
    }

    const session: ISessionByRefreshToken = await findSessionByRefreshToken(newRefreshTokenHash);

    return {
        accessToken: generateAccessToken({userId: session.userId, tenantId: session.tenantId, roles: session.roles}, session.id),
        refreshToken: newRefreshToken,
        expiration: session.expiration,
    };
}

export async function expireSession(refreshToken: RefreshToken, expiration: Date): Promise<string> {
    if (!refreshToken) {
        return null;
    }

    const refreshTokenHash: string = hashData(refreshToken);
    const session: ISessionByRefreshToken = await findSessionByRefreshToken(refreshTokenHash);

    if (!session) {
        return null;
    }

    await expireSessionByRefreshToken(refreshTokenHash, expiration);
    return session.id;
}