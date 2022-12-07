import {createHash} from "crypto";

export function hashData(data: string): string {
    return createHash('sha256').update(data).digest('base64');
}