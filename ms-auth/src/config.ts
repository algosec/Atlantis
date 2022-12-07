import {readFileSync} from "fs";
import * as jwt from "jsonwebtoken";
import {default as sharedConfig} from "../../shared/src/config";
import {globalConfig} from "../../shared/src/globalConfig";
const config = {
    ...sharedConfig,
    express: {
        host: '0.0.0.0',
        port: 3001,
        serverName: `Atlantis ms-auth (${process.env.BUILD_DESCRIPTION || 'development'})`,
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'ms-auth',
        password: process.env.DB_PASS || 'dev',
        database: process.env.DB_NAME || 'ms-auth'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379
    },
    jwt: {
        algorithm: <jwt.Algorithm> 'RS256',
        expirationSeconds: Number(process.env.JWT_EXPIRATION_SECONDS) || 15 * 60,
        issuer: 'ms-auth',
        key: {
            privateKey: sharedConfig.isProduction || process.env.JWT_PRIVATE_KEY_FILE ? readFileSync(process.env.JWT_PRIVATE_KEY_FILE).toString() : globalConfig.JWTKeys.privateKey,
            publicKey: sharedConfig.isProduction || process.env.JWT_PUBLIC_KEY_FILE ? readFileSync(process.env.JWT_PUBLIC_KEY_FILE).toString() : globalConfig.JWTKeys.publicKey
        }
    },
    refreshToken: {
        headerName: "X-Auth-Refresh-Token",
        expirationSeconds: Number(process.env.REFRESH_TOKEN_EXPIRATION_SECONDS) || 60 * 60 * 24 * 14,
        apiPath: "/api/auth/jwt/refresh-token"
    },
};

export default config;