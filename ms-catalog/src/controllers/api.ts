import {Router} from "express";

import {infoApiRouter} from './api-info';
import {actionsApiRouter} from './api-actions';

const router: Router = Router();

router.use(infoApiRouter);
router.use(actionsApiRouter);

// all other API request -> not found
router.all('/*', (req, res) => res.status(404).send());

export {
    router
};