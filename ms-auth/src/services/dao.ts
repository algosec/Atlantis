import {query} from '../../../shared/src/services/db';
import {ResultSetHeader, RowDataPacket} from "mysql2/promise";
import {IUser} from "../model";
import {hashData} from "../utils/hash-string";
import {v4 as uuidv4} from 'uuid';
import {IRevokeAccessToken, ISessionInfo, Role} from "../../../shared/src/auth/model";

export async function searchUserByCredentials(username: string, password: string): Promise<IUser> {
    const [rows] = await query<RowDataPacket[]>('SELECT id, tenantId, username, displayName, roles FROM users WHERE username = ? AND password = ?', [username, hashData(password)]);
    return (rows.length > 0) ? <IUser> rows[0] : null;
}

export async function searchUserById(tenantId: string, userId: string): Promise<IUser> {
    const [rows] = await query<RowDataPacket[]>('SELECT id, username, displayName, roles FROM users WHERE tenantId = ? AND id = ?', [tenantId, userId]);
    return (rows.length > 0) ? <IUser> rows[0] : null;
}

export async function getActiveSessions(tenantId: string): Promise<ISessionInfo[]> {
    const [rows] = await query<RowDataPacket[]>(`SELECT s.id, s.created, s.lastActivity, s.userAgent, s.ipAddress, JSON_OBJECT('id', u.id, 'username', u.username, 'displayName', u.displayName) as user FROM sessions s JOIN users u ON s.user = u.id WHERE s.tenantId = ? AND expiration > NOW() AND refreshToken is not NULL`, [tenantId]);
    return <ISessionInfo[]> rows;
}

export async function createSession(tenantId: string, userId: string, expiration: Date, userAgent: string, ipAddress: string, refreshToken: string): Promise<boolean> {
    const [res] = await query<ResultSetHeader>('INSERT INTO sessions (id, tenantId, user, expiration, userAgent, ipAddress, refreshToken) VALUES ?', [[[
        uuidv4(),
        tenantId,
        userId,
        expiration,
        userAgent,
        ipAddress,
        refreshToken
    ]]]);

    return (res.affectedRows === 1);
}


export async function refreshSession(refreshToken: string, newRefreshToken: string, expirationSeconds: number, userAgent: string, ipAddress: string): Promise<boolean> {
    const [res] = await query<ResultSetHeader>(`UPDATE sessions SET refreshToken = ?, lastActivity = now(), expiration = DATE_ADD(now(), INTERVAL ? SECOND) , userAgent = ?, ipAddress = ? WHERE refreshToken = ? AND expiration > NOW()`, [newRefreshToken, expirationSeconds, userAgent, ipAddress, refreshToken]);
    return (res.affectedRows === 1);
}

export interface ISessionByRefreshToken {
    id: string;
    tenantId: string;
    expiration: Date;
    userId: string;
    roles: Role[];
}
export async function findSessionByRefreshToken(refreshToken: string): Promise<ISessionByRefreshToken> {
    const [rows] = await query<RowDataPacket[]>(`SELECT s.id, s.tenantId, s.expiration, u.id as userId, u.roles FROM sessions s JOIN users u ON s.user = u.id WHERE refreshToken = ?`, [refreshToken]);
    return (rows.length > 0) ? <ISessionByRefreshToken> rows[0] : null;
}

export async function findRevokedSessions(): Promise<IRevokeAccessToken[]> {
    const [rows] = await query<(IRevokeAccessToken & RowDataPacket)[]>(`SELECT id, expiration FROM sessions WHERE expiration <= NOW() OR refreshToken is NULL`);
    return rows;
}

export async function expireSessionByRefreshToken(refreshToken: string, expiration: Date): Promise<void> {
    await query<RowDataPacket[]>('UPDATE sessions SET refreshToken = NULL, expiration = ? WHERE refreshToken = ?', [expiration, refreshToken]);
}

export async function createOrUpdateUser(tenantId: string, username: string, displayName: string, initialRoles: Role[]): Promise<string> {
    const [rows] = await query<RowDataPacket[]>('SELECT id FROM users where tenantId = ? AND username = ? ', [tenantId, username]);
    const userId: string =  (rows.length > 0) ? rows[0].id : null;

    if (userId) {
        await updateUserInfo(tenantId, userId, displayName);
        return userId;
    } else {
        return await createUser(tenantId, username, displayName, initialRoles);
    }
}

export async function createUser(tenantId: string, username: string, displayName: string, roles: Role[]): Promise<string> {
    const userId = uuidv4();
    const [res] = await query<ResultSetHeader>('INSERT INTO users (id, tenantId, username, displayName, roles) VALUES ?', [[[
        userId,
        tenantId,
        username,
        displayName,
        JSON.stringify(roles)
    ]]]);
    return (res.affectedRows === 1) ? userId : null;
}

export async function updateUserInfo(tenantId: string, userId: string, displayName: string): Promise<boolean> {
    const [res] = await query<ResultSetHeader>('UPDATE users SET displayName = ? WHERE tenantId = ? AND id = ?', [displayName, tenantId, userId]);
    return (res.affectedRows === 1);
}

