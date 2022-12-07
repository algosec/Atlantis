import {Role, AccessToken, RefreshToken} from "../../shared/src/auth/model";

export interface IUserIdentifier extends Record<string, unknown> {
    id: string;
    tenantId: string;
}

export interface IUser extends IUserIdentifier {
    username: string;
    displayName: string;
    roles: Role[];
}

export interface IRefreshTokenWithExpiration {
    refreshToken: RefreshToken;
    expiration: Date;
}

export interface IAccessTokenWithRefreshToken extends IRefreshTokenWithExpiration {
    accessToken: AccessToken;
}

export type SingleSignOnType = 'SAML';

export interface ISingleSignOn {
    type: SingleSignOnType;
}

export interface ISamlSingleSignOn extends ISingleSignOn {
    type: 'SAML';
    entryPoint: string;
    issuer: string;
    callbackUrl: string;
    cert: string;
    userAttribute: string;
    displayNameAttribute: string;
}
