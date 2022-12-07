import {NextFunction, Request, Response} from "express";
import log from "./log";
import {internalServerError} from "./response-composer";

export function asyncErrorMiddleware(fn: (req: Request, res: Response, next?: NextFunction) => Promise<void>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

export function defaultErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    log.error(`Unhandled exception in "${req.method} ${req.url}" - ${err}`, err);
    res.status(500).send(internalServerError(`Unhandled exception in "${req.method} ${req.url}": ${err}`));
}
