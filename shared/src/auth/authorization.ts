import {Role} from "./model";
import {NextFunction, Request, Response} from "express";
import {fetchUser} from "./authentication";

export function authorize(role: Role) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (role && !fetchUser(req).roles.includes(role)) {
            // user's role is not authorized
            res.status(403).json({ message: 'Forbidden' });
            return;
        }

        // authentication and authorization successful
        next();
    }
}