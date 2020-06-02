#!/usr/bin/env node

"use strict";

const os = require("os");
const fs = require("fs").promises;
const axios = require("axios");

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
  .option("--reuse-html", "Reuse the previously downloaded HTML", false)
  .parse(process.argv);

let logLevel = LogLevels.ERROR;
logLevel = cli.showWarnings && LogLevels.WARNING || LogLevels.ERROR;
logLevel = cli.showInfo && LogLevels.INFO || LogLevels.WARNING;
logLevel = cli.showDebug && LogLevels.DEBUG || LogLevels.INFO;

const dumpFileName = "./html-dump.html"

const logger = new Logger("cli", logLevel);

const run = async () => {
  logger.info("starting up...");

  const json = await fs.readFile(cli.spider, { encoding: "utf8"});
  const spider = new Spider(JSON.parse(json));

  let processedPages = 0
  while (processedPages < cli.nrOfPages) {
    const url = spider.getNextUrl();
    let html;
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
    const items = spider.extract(html);
    console.log(items);
    processedPages++;
    logger.info(`waiting ${cli.wait}ms...`)
    await delay(cli.wait);
  }
}

run().catch(err => {
  console.error("Error: ", err);
});
