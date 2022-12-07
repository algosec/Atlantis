import {Router} from "express";
import {asyncErrorMiddleware} from "../../../shared/src/utils/async-error-middleware";
import {badRequest} from "../../../shared/src/utils/response-composer";
import {readSetting} from "../services/dao";

export const controllersRouter: Router = Router();

async function getSettingLogic(tenantId: string, key: string, res) {
    const value = await readSetting(key, tenantId);

    if (value === null) {
        res.status(400).send(badRequest(`key '${key}' does not exist`));
        return;
    }

    res.json(value);
}

controllersRouter.get('/internal/:tenantId/:key', asyncErrorMiddleware(async (req, res) => {
    await getSettingLogic(req.params.tenantId, req.params.key, res);
}));
