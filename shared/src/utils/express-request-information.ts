import {Request} from "express";

export function fetchClientIpAddress(req: Request): string {
    return <string> req.headers['x-forwarded-for'] || req.socket.remoteAddress;
}

export function fetchUserAgent(req: Request): string {
    return req.useragent.source;
}