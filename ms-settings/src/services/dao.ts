import {query} from '../../../shared/src/services/db';
import {RowDataPacket} from "mysql2/promise";

export async function readSetting(key: string, tenantId: string): Promise<unknown> {
    const [rows] = await query<RowDataPacket[]>('SELECT value FROM `settings` WHERE `key` = ? AND `tenantId` = ?', [key, tenantId]);
    return (rows.length > 0) ? rows[0].value : null;
}
