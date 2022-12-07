export enum RestStatus {
    OK,
    BAD_REQUEST,
    INTERNAL_SERVER_ERROR
}

export interface DefaultRestResponse {
    status: string;
    message: string;
}

function compose(status: RestStatus, message: string): DefaultRestResponse {
    return {
        status: RestStatus[status],
        message: message
    };
}

export function ok(message: string): DefaultRestResponse {
    return compose(RestStatus.OK, message);
}

export function badRequest(message: string): DefaultRestResponse {
    return compose(RestStatus.BAD_REQUEST, message);
}

export function internalServerError(message: string): DefaultRestResponse  {
    return compose(RestStatus.INTERNAL_SERVER_ERROR, message);
}