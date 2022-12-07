import {readFileSync} from "fs";
import log from '../../../../shared/src/utils/log';
import * as compile from "string-template/compile";
import config from '../../config';
import {badRequest, ok} from '../../../../shared/src/utils/response-composer';
import {areCardsExistInBuild} from '../../services/dao';
import {
  BrowserStorageMap,
  generateElementScreenshot,
  generatePdf,
  getElementText, openBrowserAndExecute,
  openPageAndExecute
} from '../../services/export-pdf';
import {publishEmail} from '../../services/email/publish-email';
import {Page} from "puppeteer-core";
import {getVersionFromBuild, isValidBuild, updateRunMode, versionToDisplayName} from "../../utils/build-parser";
import {Request, Response} from "express";
import {ExpressUser, fetchUser} from "../../../../shared/src/auth/authentication";

const BUILD_RESULTS_HTML_TEMPLATE = compile(readFileSync('resources/emails/build-results.template.html', 'utf-8'));

interface PublishBuildResultsRequest {
    build: string;
    runMode: string;
    audience: string;
}
const MANDATORY_FIELDS = ['build', 'runMode', 'audience'];

async function sendNotification(request: PublishBuildResultsRequest, user: ExpressUser): Promise<void> {
    try {
        const build = request.build;
        const branch = updateRunMode(request.runMode);
        const version = getVersionFromBuild(build);

        log.info(`Going to notify about build ${build} results of branch ${branch}`);

        const buildResultUrl = `${config.webBaseUrl}/dashboards/build-results/${branch}/${build}`;
        const trendUrl = `${config.webBaseUrl}/dashboards/branch-trend/${version}/${branch}`;
        const summaryUrl = `${config.webBaseUrl}/channels/${version}/${branch}`;

        let pdfData: Buffer, summaryPngData: Buffer, branchTrendPngData: Buffer;
        let passRate: string;

        const sessionStorageMap: BrowserStorageMap = {'ONE_TIME_ACCESS_TOKEN': JSON.stringify(user.accessToken)};

        await openBrowserAndExecute(async (browser) => {
            const p1: Promise<void> = openPageAndExecute(browser, buildResultUrl, null, sessionStorageMap, async (page: Page) => {
                log.info("Fetch information #1...");
                pdfData = await generatePdf(page);
                summaryPngData = await generateElementScreenshot(page, '.summary');
                passRate = await getElementText(page, '.pass-rate-value');
            });

            const p2: Promise<void> = openPageAndExecute(browser, trendUrl, null, sessionStorageMap, async (page: Page) => {
                log.info("Fetch information #2...");
                branchTrendPngData = await generateElementScreenshot(page, ".chart-data");
            });

            log.info("waiting for async");
            await Promise.all([p1, p2]);
        })

        const subject = `CI-3 Results: ${versionToDisplayName(build)} ${branch} - ${passRate} (${build})`;
        const attachmentFileName = `${build}-results.pdf`;
        const attachmentContent = pdfData.toString('base64');
        const body = BUILD_RESULTS_HTML_TEMPLATE({
            build,
            branch,
            summaryPngData: summaryPngData.toString('base64'),
            branchTrendPngData: branchTrendPngData.toString('base64'),
            summaryUrl,
            buildResultUrl,
            trendUrl
        });

        await publishEmail(request.audience, subject, body, attachmentFileName, attachmentContent);
        log.info(`Finished to notify about build ${build} results`);
    } catch (error) {
        log.error("failed to notify about build results ", error);
    }
}

export async function publishBuildResults(req: Request, res: Response): Promise<void> {
    const user: ExpressUser = fetchUser(req);
    const tenantId: string = user.tenantId;
    const request: PublishBuildResultsRequest = req.body;

    const missingFields = MANDATORY_FIELDS.filter(k => !(k in request && request[k] !== null));
    if (missingFields.length > 0) {
        res.status(400).send(badRequest(`request missing the following fields: ${missingFields.join(", ")}`));
        return;
    }

    if (!isValidBuild(request.build)) {
        res.status(400).send(badRequest(`build ${request.build} is invalid`));
        return;
    }

    if (! await areCardsExistInBuild(tenantId, request.build)) {
        res.status(400).send(badRequest(`no results exist for build ${request.build}`));
        return;
    }

    // mark request as finished, and continue async
    res.status(202).send(ok(`accepted - will notify about build ${request.build} to ${request.audience}`));

    // execute logic
    await sendNotification(request, user);
}