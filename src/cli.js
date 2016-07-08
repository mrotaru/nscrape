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
  .option('-p, --pipelines <pipelines>', 'Which pipelines to load')
  .option('--proxy', 'Use a proxy') // "http://127.0.0.1:8888" for Request
  .option('-s, --spider <name>', 'Which spiders to load')
  .option('-v, --verbose', 'Verbose output')
  .option('-w, --wait <ms>', 'Wait between requests')
  .option('--web', 'Web interface to start')
  .parse(process.argv)

// create runner
let runner = Object.create(Runner)

runner.init(merge(config, cli))

if (config.web) {
  require('./web/app.js')(runner)
} else {
  if (runner.config.autoStart) {
    runner.start()
  }
}
