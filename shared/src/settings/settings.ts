import {subscribe} from "../services/redis";
import axios, {AxiosResponse} from "axios";
import config from "../config";

export interface ISettingValue {
    tenantId: string;
    key: string;
    value: string;
}

export const NOTIFY_SETTING_CHANGED_CHANNEL = "NOTIFY_SETTING_CHANGED_CHANNEL";

/**
 * The key is a concatenation of tenant id with the settings key:
 * E.g. <tenant-id>#<key> --> <value>
 */
const settingsCache = new Map<string, unknown>();

export function initSettings(): void {
    // register to get notified when another session has been revoked
    subscribe(NOTIFY_SETTING_CHANGED_CHANNEL, handleNotifySettingChangedEvent);
}

export async function getSetting<T>(tenantId: string, key: string): Promise<T> {
    let value = settingsCache.get(composeTenantKey(tenantId, key));

    if (!value) {
        value = await loadSetting(tenantId, key);
        cacheSetting(tenantId, key, value);
    }

    return <T> value;
}

function handleNotifySettingChangedEvent(event: ISettingValue): void {
    const tenantKey = composeTenantKey(event.tenantId, event.key);
    if (!settingsCache.has(tenantKey)) {
        return;
    }
    cacheSetting(event.tenantId, event.key, event.value);
}

function cacheSetting<T>(tenantId: string, key: string, value: T): void {
    settingsCache.set(composeTenantKey(tenantId, key), value);
}

async function loadSetting<T>(tenantId: string, key: string): Promise<T> {
    const response: AxiosResponse<T> = await axios.get<T>(`${config.msSettingsUrl}/internal/${tenantId}/${key}`);
    return response.data;
}

function composeTenantKey(tenantId: string, key: string) {
    return `${tenantId}#${key}`;
}
