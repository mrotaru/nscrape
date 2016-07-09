#!/usr/bin/env node

'use strict'

let os = require('os')
let merge = require('deep-extend')

let Runner = require('./runner.js')

// load config - from the user's home, and then curent directory
let config = merge({}, require('./default-config-cli.json'))
try {
  merge(config, require(`${os.homedir()}/.nscraper`))
  merge(config, require(`${__dirname}/.nscraper`))
} catch (err) {
}

// parse command-line arguments; can override previously loaded config
let cli = require('commander')
  .version('0.0.2')
  .option('--auto-start', 'Kick off each spider')
  .option('-d, --debug', 'Print debug info')
  .option('-i, --insecure', 'Allow running of scripts')
  .option('--html-debug-file', 'Store html causing errors in files')
  .option('--pages <number>', 'How many pages to scrape')
  .option('-p, --pipes <pipes>', 'Which pipes to load')
  .option('--proxy', 'Use a proxy')
  .option('-s, --spiders <names>', 'Which spiders to load')
  .option('-v, --verbose', 'Verbose output')
  .option('-w, --wait <ms>', 'Wait between requests')
  .option('--web', 'Web interface to start')
  .parse(process.argv)

// default configs will be added by `Runner` on `init`, so we don't do
// that here; we're just using it to see which properties to extract from
// the object `commander` gives us, overriding their values in `config`
let defaultConfig = require('./default-config.json')
for (let prop of Object.keys(cli)) {
  if (prop === 'pipes' || prop === 'spiders') {
    config[prop] = cli[prop].split(',')
  } else {
    if (defaultConfig.hasOwnProperty(prop)) {
      config[prop] = cli[prop]
    }
  }
}

// create runner
let runner = Object.create(Runner).init(config)

if (config.web) {
  require('./web/app.js')(runner)
} else {
  if (runner.config['auto-start']) {
    runner.start()
  }
}
