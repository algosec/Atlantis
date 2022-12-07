import {Router} from "express";
import * as passport from "passport";
import {findRevokedSessions, getActiveSessions, searchUserById} from "../services/dao";
import {asyncErrorMiddleware} from "../../../shared/src/utils/async-error-middleware";
import {fetchUser} from "../../../shared/src/auth/authentication";
import {authorize} from "../../../shared/src/auth/authorization";
import {Role} from "../../../shared/src/auth/model";

export const controllersRouter: Router = Router();

controllersRouter.get('/user', passport.authenticate('jwt', {session: false}), asyncErrorMiddleware(async (req, res) => { res.json(await searchUserById(fetchUser(req).tenantId, fetchUser(req).userId)); }));

controllersRouter.get('/sessions/active', passport.authenticate('jwt', {session: false}), authorize(Role.Admin), asyncErrorMiddleware(async (req, res) => { res.json(await getActiveSessions(fetchUser(req).tenantId)); }));
controllersRouter.get('/sessions/revoked', asyncErrorMiddleware( async (req, res) => { res.json(await findRevokedSessions()); }));