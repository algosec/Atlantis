import {AccessToken, IAccessTokenPayload} from "./model";

export function extractPayloadFromAccessToken(accessToken: AccessToken): IAccessTokenPayload {
    return accessToken ? <IAccessTokenPayload>internalExtractPayload(accessToken) : null;
}

export function extractAccessTokenExpiration(accessToken: AccessToken): number {
    return internalExtractPayload(accessToken).exp;
}

export function extractTenantIdFromAccessToken(accessToken: AccessToken): string {
    return extractPayloadFromAccessToken(accessToken)?.tenantId;
}

export function calculateAccessTokenExpiresIn(accessToken: AccessToken): number {
    // calculate the number of seconds until it expires
    return extractAccessTokenExpiration(accessToken) - Math.floor(Date.now() / 1000);
}

function internalExtractPayload(accessToken: AccessToken) {
    // parse json object from base64 encoded jwt token
    return JSON.parse(atob(accessToken.split('.')[1]));
}