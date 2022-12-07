import {Response} from "express";
import config from "../config";
import {RefreshToken} from "../../../shared/src/auth/model";

export function setRefreshTokenCookie(res: Response, refreshToken: RefreshToken, expiration: Date): void {
    res.cookie(config.refreshToken.headerName, refreshToken, {
        secure: config.isProduction,
        expires: expiration,
        httpOnly: true,
        sameSite: "strict",
        path: config.refreshToken.apiPath,
    });
}