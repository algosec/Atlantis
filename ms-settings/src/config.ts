import {default as sharedConfig} from "../../shared/src/config";

const config = {
    ...sharedConfig,
    express: {
        host: '0.0.0.0',
        port: 3002,
        serverName: `Atlantis ms-settings (${process.env.BUILD_DESCRIPTION || 'development'})`,
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'ms-settings',
        password: process.env.DB_PASS || 'dev',
        database: process.env.DB_NAME || 'ms-settings'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379
    },
};

export default config;
