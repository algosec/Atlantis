import log from '../utils/log';
import {sleep} from '../utils/sleep-promise';
import * as mysql from 'mysql2/promise';
import {PoolConnection, OkPacket, FieldPacket, RowDataPacket, ResultSetHeader} from "mysql2/promise";

const MAX_RETRY = 10;
const UNRECOVERABLE_ERRORS = ['Access denied for user', 'getaddrinfo ENOTFOUND'];

export interface IDataBaseCredentials {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

let pool: mysql.Pool;

function createConnectionPool(config: IDataBaseCredentials) {
    log.info(`creating DB connection pool to ${config.host}:${config.port}`);
    pool = mysql.createPool({
        connectionLimit: 10,
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
    });

    pool.on('acquire', function (connection) {
        log.silly('Connection %d acquired', connection.threadId);
    });
    pool.on('connection', function (connection) {
        log.silly('Connection %d created', connection.threadId);
    });
    pool.on('enqueue', function () {
        log.silly('Waiting for available connection slot');
    });
    pool.on('release', function (connection) {
        log.silly('Connection %d released', connection.threadId);
    });
}

export async function initDatabaseClient(config: IDataBaseCredentials): Promise<boolean> {
    createConnectionPool(config);

    for (let i=1 ; i<=MAX_RETRY ; i++) {
        log.info(`connecting to DB - retry #${i}`);
        const error = await testConnection();

        if (!error) {
            log.info('connecting to DB - done');
            return true;
        }

        log.warn(`failed to connect to DB: ${error}`);

        if (UNRECOVERABLE_ERRORS.some(e => error.includes(e))) {
            return false;
        }

        await sleep(1000);
    }

    return false;
}

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.release();
    } catch (e) {
        return e.message;
    }
}

export async function query<T extends RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader>(sql: string, values?: unknown | unknown[]): Promise<[T, FieldPacket[]]> {
    log.debug(`Executing SQL: ${format(sql, values)}`);
    return pool.query<T>(sql, values);
}

export function format(sql: string, values?: unknown | unknown[]): string {
    return mysql.format(sql, values);
}

export async function transaction(func: (connection: PoolConnection) => Promise<void>): Promise<void> {
    log.silly('--- create connection for transaction');
    const connection: PoolConnection = await pool.getConnection();

    try {
        log.silly('--- begin transaction');
        await connection.beginTransaction();

        try {
            log.silly('--- calling user function');
            await func(connection);
            log.silly('--- commit transaction');
            await connection.commit();
        } catch (e) {
            log.silly(`--- rollback transaction due to error`, e);
            await connection.rollback();
            throw e;
        }
    }
    finally {
        log.silly('--- release connection');
        connection.release();
    }
}

export async function closeDatabaseClient(): Promise<void> {
    log.info("end DB connection pool");
    await pool.end();
}