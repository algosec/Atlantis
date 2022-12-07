import {default as sharedConfig} from "../../shared/src/config";

const config = {
    ...sharedConfig,
    express: {
        host: '0.0.0.0',
        port: 3000,
        serverName: `Atlantis ms-catalog (${process.env.BUILD_DESCRIPTION || 'development'})`
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'ms-catalog',
        password: process.env.DB_PASS || 'dev',
        database: process.env.DB_NAME || 'ms-catalog'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379
    },
    pdf: {
      timeoutSeconds: 180 // 3 minutes
    },
    disableCache: process.env.DISABLE_CACHE === 'true'
};

export default config;