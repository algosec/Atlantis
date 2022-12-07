import log from "../../shared/src/utils/log";
import {sleep} from "../../shared/src/utils/sleep-promise";
import axios, {AxiosResponse} from "axios";
import config from "./config";
import {configureJwtPassport} from "../../shared/src/auth/authentication";
import {IAccessTokenPublicCertificate, IRevokeAccessToken} from "../../shared/src/auth/model";

const MAX_RETRY = 10;
const UNRECOVERABLE_ERRORS = ['getaddrinfo ENOTFOUND', 'Request failed with status code 404'];

export async function initJwtPublicKey(): Promise<boolean> {
    for (let i=1 ; i<=MAX_RETRY ; i++) {
        log.info(`connecting to DB - retry #${i}`);
        const error = await loadJwtPublicKey();

        if (!error) {
            log.info('Get JWT public key from ms-auth - done');
            return true;
        }

        log.warn(`Failed to get JWT public key from ms-auth: ${error}`);

        if (UNRECOVERABLE_ERRORS.some(e => error.includes(e))) {
            return false;
        }

        await sleep(1000);
    }

    return false;
}

async function loadJwtPublicKey() {
    try {
        const publicKey: AxiosResponse<IAccessTokenPublicCertificate> = await axios.get(`${config.msAuthUrl}/jwt/public-key`);
        const revokedSessions: AxiosResponse<IRevokeAccessToken[]> = await axios.get(`${config.msAuthUrl}/sessions/revoked`);
        configureJwtPassport(publicKey.data.publicKey, revokedSessions.data);
    } catch (e) {
        return e.message;
    }
}