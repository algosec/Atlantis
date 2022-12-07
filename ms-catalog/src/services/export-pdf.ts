import log from '../../../shared/src/utils/log';
import * as puppeteerCore from "puppeteer-core";
import {ConsoleMessage, Page, Browser, ConsoleMessageType, ElementHandle, HTTPRequest} from "puppeteer-core";
import { v4 as uuidv4 } from 'uuid';
import config from "../config";

export interface BrowserStorageMap {
    [key: string]: string
}

// block DEV live-reload requests
const BLOCKING_URL_FOR_DEV = ["/sockjs-node/", "/socket.io/"];
const DISCARD_CONSOLE_MESSAGES = [
  "Angular is running in development mode. Call enableProdMode() to enable production mode.",
  "Failed to load resource: net::ERR_FAILED",
  "[WDS] Disconnected!"
];

let puppeteer = puppeteerCore;
let puppeteer_options = {};

// for local development (WINDOWS) the puppeteer package download chromium as part of it.
// for prod environment (shipped in docker container), we use puppeteer-core, and download chromium aside.
if (!config.isProduction) {
    puppeteer = require("puppeteer");
} else {
    puppeteer = puppeteerCore;
    puppeteer_options = {
        ...puppeteer_options,
        executablePath: '/usr/bin/chromium-browser', // this binary is provided by the "apk add chromium" command (see Dockerfile)
        args : ['--no-sandbox'] // needed since we are running on docker container which runs with root
    };
}

async function injectBrowserStorageToPage(page: Page, localStorageMap: BrowserStorageMap, sessionStorageMap: BrowserStorageMap) {
    await page.evaluateOnNewDocument ((localStorageMap, sessionStorageMap) => {
        if (sessionStorageMap) {
          sessionStorage.clear();
          for (const [key, val] of Object.entries(sessionStorageMap)) {
            sessionStorage.setItem(key, <string>val);
          }
        }

        if (localStorageMap) {
          localStorage.clear();
          for (const [key, val] of Object.entries(localStorageMap)) {
            localStorage.setItem(key, <string>val);
          }
        }
    }, localStorageMap, sessionStorageMap);
}

async function disableDevelopmentLiveReload(page: Page, uuid: string) {
    await page.setRequestInterception(true);
    page
      .on('request', (request) => {
          if (isUrlToBeBlocked(request.url())) {
              logPageConsole(uuid,  'debug', `REST aborted ${request._interceptionId} ${request.url()}`);
              request.abort();
              return;
          }
          logPageConsole(uuid,  'debug', `REST started ${request._interceptionId} ${request.url()}`);
          request.continue();
      })
      .on('requestfinished', (request: HTTPRequest) => {
          logPageConsole(uuid, 'debug', `REST finished ${request._interceptionId} ${request.url()}`);
      })
      .on('requestfailed', (request: HTTPRequest) => {
          // discard certain messages
          if (request.failure().errorText === "net::ERR_FAILED" && isUrlToBeBlocked(request.url())) {
            return;
          }
          logPageConsole(uuid, 'warning',`${request.failure().errorText} ${request._interceptionId} ${request.url()}`);
      })
}

function isUrlToBeBlocked(url: string): boolean {
  return BLOCKING_URL_FOR_DEV.some(val => url.includes(val));
}

function connectConsole(page: Page, uuid: string) {
    page.on('console', (message: ConsoleMessage) => {
        // discard certain messages
        if (DISCARD_CONSOLE_MESSAGES.some(val => message.text() === val)) {
          return;
        }
        logPageConsole(uuid, 'info', `[${message.type().substr(0, 5)}] ${message.text()}`);
    });
}

function logPageConsole(uuid: string, type: ConsoleMessageType, message: string) {
    const logMessage = `[page #${uuid}] ${message}`;
    if (type === 'debug') {
        log.debug(logMessage);
    } else {
        log.info(logMessage);
    }
}

export async function openBrowserAndExecute<T>(callback: (browser) => Promise<T>): Promise<T> {
    log.info(`Opening browser`);
    const browser = await puppeteer.launch(puppeteer_options);

    try {
        return await callback(browser);
    } finally {
        log.info(`Closing browser`);
        await browser.close();
    }
}

export async function openPageAndExecute<T>(browser: Browser, url: string, localStorageMap: BrowserStorageMap, sessionStorageMap: BrowserStorageMap, callback: (page) => Promise<T>): Promise<T> {
    const uuid = uuidv4().substr(0, 8);
    log.info(`Opening page (UUID=${uuid}): ${url}`);
    const page: Page = await browser.newPage();
    try {
        await injectBrowserStorageToPage(page, localStorageMap, sessionStorageMap);
        await disableDevelopmentLiveReload(page, uuid);
        connectConsole(page, uuid);

        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: config.pdf.timeoutSeconds * 1000
        });

        return await callback(page);
    } finally {
        log.info(`Closing page (UUID=${uuid}): ${url}`);
        await page.close();
    }
}

export async function openBrowserPageAndExecute<T>(url: string, localStorageMap: BrowserStorageMap, sessionStorageMap: BrowserStorageMap, callback: (page) => Promise<T>): Promise<T> {
    return await openBrowserAndExecute(async (b) => openPageAndExecute(b, url, localStorageMap, sessionStorageMap, callback));
}

export async function generatePdf(page: Page): Promise<Buffer> {
    return await page.pdf( {
        printBackground: true,
        format: 'a4',
        landscape: true
    });
}

export async function generateElementScreenshot(page: Page, selector: string): Promise<Buffer> {
    await page.waitForSelector(selector);
    const element: ElementHandle = await page.$(selector);
    return <Buffer> await element.screenshot({
        type: "png"
    });
}

export async function getElementText(page: Page, selector: string): Promise<string> {
    await page.waitForSelector(selector);
    const element: ElementHandle= await page.$(selector);
    return await page.evaluate(el => el.textContent, element);
}