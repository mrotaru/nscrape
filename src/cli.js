#!/usr/bin/env node

"use strict";

const os = require("os");

const { logObject } = require("./utils.js");
const nscrape = require("./index.js");

let cli = require("commander")
  .version("1.0.0")
  .option("--auto-start", "Kick off each spider", false)
  .option("-w, --wait <ms>", "Wait between requests", 1000)
  .option("-i, --insecure", "Allow running of scripts", false)
  .option("--pages <number>", "How many pages to scrape", 1)
  .option("--proxy", "Use a proxy", false)
  .option("-s, --spiders <names>", "Which spiders to load", [])
  .option("-v, --verbose", "Verbose output", false)
  .option("-d, --debug", "Print debug info", false)
  .option("--html-debug-file", "Store html causing errors in files", false)
  .parse(process.argv);

logObject(cli);
