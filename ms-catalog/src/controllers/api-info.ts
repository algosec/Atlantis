import {asyncErrorMiddleware} from "../../../shared/src/utils/async-error-middleware";
import {
    getBranchesConfiguration,
    getBranchesOwners,
    getBranchTrend,
    getBuildsByBranchByTeam,
    getCardsByBranchAndBuild,
    getChannel,
    getChannelsConfiguration,
    getChannelsLatestSummary,
    getChannelsOwners,
    getDefects,
    getDefectsByChannels,
    getOrphanDefects,
    getTeams,
    getNumberOfRunsBuild
} from "../services/dao";
import {badRequest} from "../../../shared/src/utils/response-composer";
import {Router} from "express";
import {generatePdf, openBrowserPageAndExecute} from "../services/export-pdf";
import {getCache, setCache} from "../../../shared/src/services/redis";
import config from "../config";
import {fetchUser} from "../../../shared/src/auth/authentication";

const DEFAULT_CACHE_TTL_SECONDS: number = 60 * 60 * 12; // 12 hours

const infoApiRouter: Router = Router();

function cacheMiddleware (ttlSeconds?: number) {
    return async (req, res, next) => {
        if (!config.disableCache) {
            const key = `__express__${req.method}__${req.originalUrl || req.url}__${fetchUser(req).tenantId}`;
            const cachedBody = await getCache(key);
            if (cachedBody !== null) {
                res.send(cachedBody);
                return;
            }

            const sendResponse = res.json;
            ttlSeconds = ttlSeconds || DEFAULT_CACHE_TTL_SECONDS;

            res.json = function (body) {
                // save cache only if response is successful
                if (res.statusCode === 200) {
                    setCache(key, ttlSeconds, body);
                }
                return sendResponse.bind(res)(body);
            }
        }
        next();
    };
}

infoApiRouter.get('/teams', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getTeams(fetchUser(req).tenantId)); }));

infoApiRouter.get('/teams/:teamId/:branch/summary', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getChannelsLatestSummary(fetchUser(req).tenantId, req.params.teamId, Number(req.params.branch))); }));

infoApiRouter.get('/teams/:version/channels/owners', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getChannelsOwners(fetchUser(req).tenantId, req.params.version)); }));
infoApiRouter.get('/teams/:version/channels/configuration', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getChannelsConfiguration(fetchUser(req).tenantId, req.params.version)); }));
infoApiRouter.get('/teams/:version/branches/configuration', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getBranchesConfiguration(fetchUser(req).tenantId, req.params.version)); }));

infoApiRouter.get('/orphan-defects', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getOrphanDefects(fetchUser(req).tenantId)); }));
infoApiRouter.get('/defects/:version', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getDefects(fetchUser(req).tenantId, req.params.version)); }));
infoApiRouter.get('/defects/:version/channels', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getDefectsByChannels(fetchUser(req).tenantId, req.params.version)); }));

infoApiRouter.get('/branches/owners', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getBranchesOwners(fetchUser(req).tenantId)); })); // used by CI status page
infoApiRouter.get('/branches/:branchId/trend', cacheMiddleware(),  asyncErrorMiddleware(async (req, res) => { res.send(await getBranchTrend(fetchUser(req).tenantId, Number(req.params.branchId))); }));

infoApiRouter.get('/channels/:version/:channel', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => {
    const data = await getChannel(fetchUser(req).tenantId, req.params.version, req.params.channel);
    if (!data) {
        res.status(400).send(badRequest(`channel '${req.params.channel}' of version '${req.params.version}' does not exist`));
        return;
    }
    res.send(data);
}));

infoApiRouter.get('/cards/:branch/:build', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getCardsByBranchAndBuild(fetchUser(req).tenantId, req.params.branch, req.params.build)); }));

infoApiRouter.get('/builds-by-branch-by-team', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => { res.send(await getBuildsByBranchByTeam(fetchUser(req).tenantId)); }));
infoApiRouter.get('/count-reruns-by-build-by-channel/:build', cacheMiddleware(), asyncErrorMiddleware(async (req, res) => {res.send(await getNumberOfRunsBuild(fetchUser(req).tenantId, req.params.build)); }));

// no cache for this!
infoApiRouter.post("/export-pdf", asyncErrorMiddleware(async (req, res) => {
    const url = req.body.url;
    const localStorageMap = req.body.localStorage;
    const sessionStorageMap = req.body.sessionStorage;
    const accessToken = fetchUser(req).accessToken;

    if (!url) {
        res.status(400).send(badRequest(`missing url to export`));
        return;
    }
    if (!url.startsWith(req.headers.origin+'/')) {
        res.status(400).send(badRequest(`can't export page ${url} since it's not in the same origin ${req.headers.origin}/`));
        return;
    }

    // add the access token for the browser to use it
    sessionStorageMap['ONE_TIME_ACCESS_TOKEN'] = JSON.stringify(accessToken);

    res.contentType("application/pdf");
    res.send(await openBrowserPageAndExecute(url, localStorageMap, sessionStorageMap, generatePdf));
}));

export {
    infoApiRouter
};