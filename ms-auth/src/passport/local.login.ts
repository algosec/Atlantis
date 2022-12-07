import * as passport from "passport";
import {Strategy as LocalStrategy} from 'passport-local';
import {IRefreshTokenWithExpiration, IUser, IUserIdentifier} from "../model";
import {searchUserByCredentials} from "../services/dao";
import {Router} from "express";
import {registerRefreshToken} from "../services/jwt";
import {setRefreshTokenCookie} from "../utils/set-refresh-token-cookie";
import {asyncErrorMiddleware} from "../../../shared/src/utils/async-error-middleware";
import {fetchClientIpAddress, fetchUserAgent} from "../../../shared/src/utils/express-request-information";

passport.use(new LocalStrategy({
        usernameField: 'user',
        passwordField: 'pass'
    },
    async (username, password, cb: (err: string, user: IUserIdentifier)=>void) => {
        const user: IUser = await searchUserByCredentials(username, password);

        if (user) {
            cb(null, {id: user.id, tenantId: user.tenantId});
        } else {
            cb('Incorrect credentials', null);
        }
    }
));

export const localRouter: Router = Router();

localRouter.post('/login/local', asyncErrorMiddleware(async (req, res) => {
    passport.authenticate('local', {session: false}, async (err, user: IUserIdentifier) => {
        if (err || !user) {
            return res.status(401).json({error: err || 'Unknown error occurred during login'});
        }

        const result: IRefreshTokenWithExpiration = await registerRefreshToken(user.tenantId, user.id, fetchUserAgent(req), fetchClientIpAddress(req));

        setRefreshTokenCookie(res, result.refreshToken, result.expiration);
        res.status(204).send();
    })(req, res);
}));