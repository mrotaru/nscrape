#!/usr/bin/env node

"use strict";

const os = require("os");
const fs = require("fs").promises;
const axios = require("axios");
// const puppeteer = require("puppeteer-core");
const { webkit } = require("playwright-webkit");

const { Logger, LogLevels } = require("./logger");
const { Spider } = require("./spider");
const { delay } = require("./utils");

let cli = require("commander")
  .version("1.0.0")
  .option("-w, --wait <ms>", "Wait between requests", 1000)
  .option("-i, --insecure", "Allow running of scripts", false)
  .option("--nr-of-pages <number>", "How many pages to scrape", 1)
  .requiredOption("-s, --spider <name>", "Which spider to load")
  .option("--show-warnings", "Show warnings", false)
  .option("--show-info", "Verbose output", false)
  .option("--show-debug", "Show debugging information - most verbose output", false)
  .option("-v, --verbose", "Verbose output (same as --show-debug)", false)
  .option("--dump-html", "Store the last fetched HTML as a file", false)
  .option("--reuse-html", "Reuse the previously fetched HTML", false)
  .option("--use-headless-browser", "Use a headless browser instead of axios/http", false)
  .parse(process.argv);

let logLevel = LogLevels.ERROR;
(cli.showDebug || cli.verbose) && (logLevel = LogLevels.DEBUG);
cli.showInfo && (logLevel = LogLevels.INFO);
cli.showWarnings && (logLevel = LogLevels.WARNING);

const dumpFileName = "./html-dump.html"

const logger = new Logger("cli", logLevel);

const run = async () => {
  logger.info("starting up...");

  const json = await fs.readFile(cli.spider, { encoding: "utf8"});
  const spider = new Spider(JSON.parse(json), {
    logLevel,
  });
  const spiderSpec = spider.specification;

  let processedPages = 0;

  let browser;
  let page;
  const headlessConfig = spiderSpec["headless-config"];
  let headless = spiderSpec["infinite-scrolling"] || spiderSpec["use-headless-browser"] || cli.headless;
  if (headless) {
    logger.info(`using a headless browser, playwright-webkit`);
    browser = await webkit.launch();
    page = await browser.newPage();
    const url = spider.getNextUrl();
    logger.info(`navigating to ${url}...`);
    await page.goto(url);
  }

  while (processedPages < cli.nrOfPages) {
    let html;
    if (headless) {
      const waitForSelector = headlessConfig?.["wait-for-element"];
      const waitMilliseconds = headlessConfig?.["wait-milliseconds"];
      if (waitForSelector || waitMilliseconds) {
        const start = Date.now();
        if (waitForSelector) {
          logger.info(`waiting for selector ${waitForSelector}...`);
          await page.waitForSelector(waitForSelector);
          logger.info(`waited for selector ${Date.now() - start}ms...`);
        }
        if (waitMilliseconds) {
          logger.info(`waiting ${waitMilliseconds}ms on the headless page...`);
          await page.waitForTimeout(parseInt(waitMilliseconds));
        }
        html = await page.content();
        if (cli.dumpHtml) {
          logger.info(`dumping HTML (${html.length}) to ${dumpFileName}...`)
          await fs.writeFile(dumpFileName, html);
        }
      }
      processedPages++;
      if (processedPages >= cli.nrOfPages) {
        await browser.close();
      } else {
        logger.info(`simulating pressing "End" on the keyboard...`);
        await page.keyboard.press("End");
      }
    } else { // not headless - use axios to fetch HTML
      const url = spider.getNextUrl();
      if (cli.reuseHtml) {
        logger.info(`loading HTML from ${url}...`)
        html = await fs.readFile(dumpFileName, { encoding: "utf8" });
      } else {
        logger.info(`downloading ${url}...`)
        const response = await axios.get(url);
        html = response.data;
        if (cli.dumpHtml) {
          await fs.writeFile(dumpFileName, html);
        }
      }
      processedPages++;
    }
    const items = spider.extract(html);
    logger.info(`extracted ${items.length} items:`)
    items.forEach(item => console.log(item));
    if (processedPages < cli.nrOfPages) {
      logger.info(`waiting ${cli.wait}ms...`)
      await delay(cli.wait);
    }
  }
  return;
}

run().then(res => {
  logger.info("done.");
}).catch(err => {
  console.error("Error: ", err);
});
