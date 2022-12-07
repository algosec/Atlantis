import {Request, Router} from "express";
import {createOrUpdateUser} from "../services/dao";
import * as passport from "passport";
import {MultiSamlStrategy} from "passport-saml/lib/passport-saml";
import {IRefreshTokenWithExpiration, ISamlSingleSignOn, IUserIdentifier} from "../model";
import {registerRefreshToken} from "../services/jwt";
import {setRefreshTokenCookie} from "../utils/set-refresh-token-cookie";
import {asyncErrorMiddleware} from "../../../shared/src/utils/async-error-middleware";
import {fetchClientIpAddress, fetchUserAgent} from "../../../shared/src/utils/express-request-information";
import log from '../../../shared/src/utils/log';
import {getSetting} from "../../../shared/src/settings/settings";
import config from "../config";

async function fetchSamlConfig(req: Request, done) {
    const tenantId = req.params.id;
    const ssoConfig = await getSetting<ISamlSingleSignOn>(tenantId, "sso");

    ssoConfig.callbackUrl = `${config.webBaseUrl}/api/auth/login/sso/callback/${tenantId}`;

    if (!ssoConfig) {
        return done(`No SSO configured for tenant ${tenantId}`);
    }

    return done(null, ssoConfig, tenantId);
}

passport.use(new MultiSamlStrategy({
        passReqToCallback: true,
        disableRequestedAuthnContext: true,
        getSamlOptions: (request, done) => fetchSamlConfig(request, done),
    },
    (req, profile, cb: (err: Error, user: IUserIdentifier)=>void) => fetchSamlConfig(req, async (err, samlConfig: ISamlSingleSignOn, tenantId: string) => {
        if (err) {
            cb(err, null);
            return;
        }

        // first - create/update the user in out users DB
        const username: string = <string> profile[samlConfig.userAttribute];
        const displayName: string = <string> profile[samlConfig.displayNameAttribute];
        const userId: string = await createOrUpdateUser(tenantId, username, displayName, []);

        cb(null, {
            id: userId,
            tenantId: tenantId
        });
    })
));

export const ssoSamlRouter: Router = Router();

/**
 * This Route Authenticates req with IDP
 * If Session is active it returns saml response
 * If Session is not active it redirects to IDP's login form
 */
ssoSamlRouter.get('/login/sso/:id',
    passport.authenticate('saml', {
        successRedirect: '/',
        failureRedirect: '/login',
        session: false
    }));

/**
 * This is the callback URL
 * Once Identity Provider validated the Credentials it will be called with base64 SAML req body
 * Here we used Saml2js to extract user Information from SAML assertion attributes
 * If every thing validated we validates if user email present into user DB.
 * Then creates a session for the user set in cookies and do a redirect to Application
 */
ssoSamlRouter.post('/login/sso/callback/:id', asyncErrorMiddleware(async(req, res) => {
    passport.authenticate('saml', { failureRedirect: '/', failureFlash: true, session: false }, async (err, user: IUserIdentifier) => {
        if (err || !user) {
            log.error("error during SSO callback", err);
            return res.status(401).json({error: err?.message || 'Unknown error occurred during login'});
        }

        const result: IRefreshTokenWithExpiration = await registerRefreshToken(user.tenantId, user.id, fetchUserAgent(req), fetchClientIpAddress(req));

        setRefreshTokenCookie(res, result.refreshToken, result.expiration);
        res.redirect("/");
    })(req, res);
}));
