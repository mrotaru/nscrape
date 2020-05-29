#!/usr/bin/env node

"use strict";

const os = require("os");

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
  .option("--html-debug-file", "Store html causing errors in files", false)
  .parse(process.argv);

let logLevel = LogLevels.ERROR;
logLevel = cli.showWarnings && LogLevels.WARNING || LogLevels.ERROR;
logLevel = cli.showInfo && LogLevels.INFO || LogLevels.WARNING;
logLevel = cli.showDebug && LogLevels.DEBUG || LogLevels.INFO;

const logger = new Logger("cli", logLevel);

const run = async () => {
  logger.info("starting up...");
  console.log(cli)

  const spider = new Spider(cli.spider);

  if (!spider.paged) {
    throw new Error("Only paged sites supported.")
  }

  let processedPages = 0
  while (processedPages < cli.nrOfPages) {
    const url = spider.getNextUrl();
    logger.info(`Downloading ${url}...`)
    const html = await axios.get(url);
    const items = spider.extract(html);
    console.log(items);
    processedPages++;
    logger.info(`Waiting ${cli.wait}ms...`)
    await delay(cli.wait);
  }
}

run();
