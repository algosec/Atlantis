import log from '../utils/log';
import * as redis from "redis";
import {RedisClient} from "redis";
import {sleep} from "../utils/sleep-promise";
import {forEach} from "p-iteration";

export interface IRedisCredentials {
    host: string;
    port: number;
}

const MAX_RETRY = 10;
const UNRECOVERABLE_ERRORS = ['Access denied for user', 'getaddrinfo ENOTFOUND'];

let redisCredentials: IRedisCredentials
let redisClient: RedisClient;
const subscriptions: RedisClient[] = [];

export function getCache<T>(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
        redisClient.get(key, async (err, cacheData) => {
            if (err) {
                reject(err);
                return;
            }

            if (cacheData !== null) {
                log.debug(`got ${key} value from cache`);
                resolve(JSON.parse(cacheData));
            } else {
                resolve(null);
            }
        });
    });
}

export function setCache<T>(key: string, ttlSeconds: number, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
        redisClient.setex(key, ttlSeconds, JSON.stringify(data), async (err) => {
            if (err) {
                reject(err);
                return;
            }

            log.debug(`Saving cache for key '${key}' for ${ttlSeconds} seconds`);
            resolve();
        });
    });
}

export async function publish<T>(channel: string, message: T): Promise<void> {
    return new Promise((resolve, reject) => {
        redisClient.publish(channel, JSON.stringify(message), (err) => {
            if (err) {
                reject(err);
                return;
            }

            log.debug(`Published message to channel '${channel}'`);
            resolve();
        });
    });
}

export function subscribe<T>(channel: string, consumer: (message: T) => void): void {
    log.info(`Register for pubsub on channel ${channel}`);
    const client = createConnection(redisCredentials);
    client.on("message", async (channel: string, message: string) => {
        await consumer(JSON.parse(message));
    });
    client.subscribe(channel);
    subscriptions.push(client);
}

export async function invalidateCache(): Promise<void> {
    return await new Promise((resolve, reject) => {
        redisClient.flushdb((err: Error) => {
            if (err) {
                reject(err);
                return;
            }

            log.info("cache was invalidated");
            resolve();
        });
    });
}

export async function closeRedisClient(): Promise<void> {
    await closeRedisClientInternal(redisClient);
    await forEach(subscriptions, closeRedisClientInternal);
}

async function closeRedisClientInternal(client: RedisClient): Promise<void> {
    return await new Promise((resolve, reject) => {
        client.quit((err: Error) => {
            if (err) {
                reject(err);
                return;
            }

            log.info("redis client was shutdown");
            resolve();
        });
    });
}

export async function initRedisClient(config: IRedisCredentials): Promise<boolean> {
    redisCredentials = config;
    log.info(`creating Redis client to ${config.host}:${config.port}`);
    for (let i=1 ; i<=MAX_RETRY ; i++) {
        log.info(`connecting to Redis - retry #${i}`);
        const error = await testConnection(config);

        if (!error) {
            log.info('connecting to Redis - done');
            redisClient = createConnection(config);
            return true;
        }

        log.warn(`failed to connect to Redis: ${error}`);

        if (UNRECOVERABLE_ERRORS.some(e => error.includes(e))) {
            return false;
        }

        await sleep(1000);
    }

    return false;
}

function createConnection(config: IRedisCredentials): RedisClient {
    const client = redis.createClient(config.port, config.host);
    client.on("connect", error => log.info("redis connection established", error));
    client.on("error", error => log.error("redis error", error));
    return client;
}

async function testConnection(config: IRedisCredentials) {
    try {
        await testConnectionInternal(config);
    } catch (e) {
        return e.message;
    }
}

function testConnectionInternal(config: IRedisCredentials) : Promise<void> {
    return new Promise((resolve, reject) => {
        let realError;
        const redisClient = redis.createClient(config.port, config.host, {
            retry_strategy: options => {
                realError = options.error; // remember the error
                return undefined; // i.e. no retry
            }
        });
        redisClient.on("ready", () => {
            redisClient.quit();
            resolve();
        });
        redisClient.on("error", (err) => {
            reject(realError || err);
        });
    });
}