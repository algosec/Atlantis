import {createServer} from './server';
import config from './config';
import {closeDatabaseClient, initDatabaseClient} from '../../shared/src/services/db';
import log from '../../shared/src/utils/log';
import {invalidateCache, initRedisClient, closeRedisClient} from "../../shared/src/services/redis";
import {initJwtPublicKey} from "./auth";

async function start() {
    // make sure Redis is available
    if (!await initRedisClient(config.redis)) {
        log.error('Terminating - exhausted to wait for Redis');
        process.exit(1);
    }

    // make sure DB is available
    if (!await initDatabaseClient(config.db)) {
        log.error('Terminating - exhausted to wait for DB');
        process.exit(1);
    }

    // get JWT public key for auth
    if (!await initJwtPublicKey()) {
        log.error('Terminating - exhausted to wait for JWT public key');
        process.exit(1);
    }

    // invalidate previous cache upon startup. Note: this has to be
    // removed when there will be multiple instances from this service
    await invalidateCache();

    // start the server
    createServer().listen(config.express.port, config.express.host, () => log.info(`==============[ ${config.express.serverName} listening on port ${config.express.port} ]==============`));
}

// This is async shutdown handler. it works in Linux, but doesn't work in Windows.
// Since the deployment of this server is on docker container (Linux based) then this is OK.
async function terminate() {
    log.info("Terminating...");

    await closeDatabaseClient();
    await closeRedisClient();

    log.info(`==============[ ${config.express.serverName} was terminated ]==============`);
    process.exit();
}

process.on("SIGINT", terminate);
process.on("SIGTERM", terminate);

start();