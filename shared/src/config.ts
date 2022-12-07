import * as jwt from "jsonwebtoken";

const config = {
    isProduction: process.env.NODE_ENV === 'production',
    jwt: {
        algorithms: <jwt.Algorithm[]> ['RS256'],
        revokedTokenCleanupIntervalSeconds: 60 * 5
    },
    webBaseUrl: process.env.WEB_BASE_URL || 'http://localhost:4200',
    msAuthUrl: process.env.MS_AUTH_URL || 'http://localhost:3001',
    msSettingsUrl: process.env.MS_SETTINGS_URL || 'http://localhost:3002',
};

export default config;