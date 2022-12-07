import {asyncErrorMiddleware} from "../../../shared/src/utils/async-error-middleware";
import {badRequest, ok} from "../../../shared/src/utils/response-composer";
import {searchUser} from "../services/jira/search-user";
import log from "../../../shared/src/utils/log";
import {
    setBranchArchived,
    setBranchesOwners,
    setBranchTitle,
    setChannelArchived,
    setChannelsOwners
} from "../services/dao";
import {syncWithTeams} from "../tasks/sync-with-teams";
import {syncWithJira} from "../tasks/sync-with-jira";
import {syncWithJenkins} from "../tasks/sync-with-jenkins";
import {syncFeatureBranches} from "../tasks/sync-feature-branches";
import {fixCardsIntegrity} from "../tasks/fix-cards-integrity";
import {notificationAllure} from "./actions/notification-allure";
import {markReviewedCard} from "./actions/mark-reviewed-card";
import {publishBuildResults} from "./actions/publish-build-results";
import {linkDefectToChannel} from "./actions/link-defect-to-channel";
import {NextFunction, Request, Response, Router} from "express";
import {invalidateCache} from "../../../shared/src/services/redis";
import {fetchUser} from "../../../shared/src/auth/authentication";
import {authorize} from "../../../shared/src/auth/authorization";
import {Role} from "../../../shared/src/auth/model";
import {globalConfig} from "../../../shared/src/globalConfig";

const actionsApiRouter: Router = Router();

// for all actions - after action finish we invalidate cache as those actions change the state of the data
function invalidateCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
    async function afterResponse() {
        res.removeListener('finish', afterResponse);
        res.removeListener('close', afterResponse);

        log.info(`Invalidating cache after after action: ${req.method} ${req.originalUrl || req.url}`);
        await invalidateCache();
    }

    res.on('finish', afterResponse);
    res.on('close', afterResponse);
    next();
}

actionsApiRouter.post('/owners', invalidateCacheMiddleware, authorize(Role.Admin), asyncErrorMiddleware(async (req, res) => {
    const tenantId = fetchUser(req).tenantId;
    const type = req.body.type;
    const resourcesIds = req.body.resourcesIds;
    const newOwnerEmail = req.body.owner;
    if (type !== 'channels' && type !== 'branches') {
        res.status(400).send(badRequest(`type must be either 'channels' or 'branches'`));
        return;
    }
    if (!Array.isArray(resourcesIds) || resourcesIds.length === 0) {
        res.status(400).send(badRequest('resourcesIds must be non-empty array of ${type} IDs'));
        return;
    }
    if (!newOwnerEmail || !newOwnerEmail.endsWith(globalConfig.emailDetails.domain)) {
        const tenantName = globalConfig.tenantDetails.tenantName
        res.status(400).send(badRequest('owner must be a valid ' + tenantName+ ' email address'));
        return;
    }
    if (!await searchUser(tenantId, newOwnerEmail)) {
        res.status(400).send(badRequest(`No such user with email address ${newOwnerEmail}`));
        return;
    }
    log.info(`Updating owner to ${newOwnerEmail} for the following ${type}: ${resourcesIds}`);
    if (type === 'channels') {
        await setChannelsOwners(tenantId, resourcesIds, newOwnerEmail);
    } else {
        await setBranchesOwners(tenantId, resourcesIds, newOwnerEmail);
    }
    res.send(ok(`${type} owner was successfully updated`));
}));

actionsApiRouter.post('/branches', invalidateCacheMiddleware, authorize(Role.Admin), asyncErrorMiddleware(async (req, res) => {
    const tenantId = fetchUser(req).tenantId;
    const branch = req.body.branch;
    if (!branch) {
        res.status(400).send(badRequest('branch should not be null'));
        return;
    }

    const newTitle: string = req.body.newTitle;
    if (req.body.newTitle) {
        log.info(`Updating title for branch ${branch} to be ${newTitle}`);
        await setBranchTitle(tenantId, branch, newTitle);
    }

    const archived: boolean = req.body.archived;
    if (archived === true || archived === false) {
        log.info(`Updating branch ${branch} to be ${archived ? 'archived' : 'visible'}`);
        await setBranchArchived(tenantId, branch, archived);
    }

    res.send(ok(`${branch} was successfully updated`));
}));

actionsApiRouter.post('/channels', invalidateCacheMiddleware, authorize(Role.Admin), asyncErrorMiddleware(async (req, res) => {
    const tenantId = fetchUser(req).tenantId;
    const channel = req.body.channel;
    if (!channel) {
        res.status(400).send(badRequest('channel should not be null'));
        return;
    }

    const archived: boolean = req.body.archived;
    if (archived === true || archived === false) {
        log.info(`Updating branch ${channel} to be ${archived ? 'archived' : 'visible'}`);
        await setChannelArchived(tenantId, channel, archived);
    }

    res.send(ok(`${channel} was successfully updated`));
}));

actionsApiRouter.post('/sync/teams', invalidateCacheMiddleware, asyncErrorMiddleware(async (req, res) => { await syncWithTeams(fetchUser(req).tenantId); res.send(); }));
actionsApiRouter.post('/sync/jira', invalidateCacheMiddleware, asyncErrorMiddleware(async (req, res) => { await syncWithJira(fetchUser(req).tenantId); res.send(); }));
actionsApiRouter.post('/sync/jenkins', invalidateCacheMiddleware, asyncErrorMiddleware(async (req, res) => { res.send("accepted - will sync with jenkins"); await syncWithJenkins(fetchUser(req).tenantId); }));
actionsApiRouter.post('/sync/feature-branches', invalidateCacheMiddleware, asyncErrorMiddleware(async (req, res) => { await syncFeatureBranches(fetchUser(req).tenantId); res.send(); }));
actionsApiRouter.post('/sync/fix-card-integrity', invalidateCacheMiddleware, asyncErrorMiddleware(async (req, res) => { await fixCardsIntegrity(fetchUser(req).tenantId); res.send(); }));
actionsApiRouter.post('/notification/allure', invalidateCacheMiddleware, asyncErrorMiddleware(notificationAllure));
actionsApiRouter.post('/notification/mark-reviewed', invalidateCacheMiddleware, asyncErrorMiddleware(markReviewedCard));
actionsApiRouter.post('/notification/build-results', invalidateCacheMiddleware, asyncErrorMiddleware(publishBuildResults));
actionsApiRouter.put('/channels/:channelId/defects', invalidateCacheMiddleware, asyncErrorMiddleware(linkDefectToChannel));

export {
    actionsApiRouter
};
