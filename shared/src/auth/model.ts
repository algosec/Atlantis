export type AccessToken = string;
export type RefreshToken = string;

export interface IAccessTokenPublicCertificate {
    publicKey: string;
}

export interface IAccessTokenPayload {
    userId: string;
    tenantId: string;
    roles: Role[];
}

export interface IAccessTokenPayloadEnhanced extends IAccessTokenPayload {
    sub: string;
}

export interface IRefreshTokenResponse {
    accessToken: string;
}

export interface IUserInfo {
    id: string;
    username: string;
    displayName: string;
}

export interface ISessionInfo {
    id: string;
    user: IUserInfo;
    created: Date;
    expiration: Date;
    lastActivity: Date;
    userAgent: string
    ipAddress: string;
}

export interface IRevokeAccessToken {
    id: string;
    expiration: Date;
}

export enum Role {
    Admin = 'Admin'
}