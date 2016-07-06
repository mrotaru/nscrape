let os = require('os')
let merge = require('merge')

let Runner = require('./runner.js')

// load config - from the user's home, and then curent directory
let config = require('./default-config.json')
try {
  merge(config, require(`${os.homedir()}/.nscraper`))
  merge(config, require(`${__dirname}/.nscraper`))
} catch (err) {
}

// parse command-line arguments; can override previously loaded config
let cli = require('commander')
  .version('0.0.2')
  .option('--web', 'Start the web interface')
  .option('-v, --verbose', 'Verbose output')
  .option('-d, --debug', 'Print debug info')
  .option('--html-debug-file', 'Store html causing errors in files')
  .option('--proxy', 'Use a proxy') // "http://127.0.0.1:8888" for Request
  .option('-f, --filters <names>', 'Filters to use', 'console')
  .option('-w, --wait <ms>', 'Wait between requests')
  .option('-s, --spider <name>', 'Which spider to run')
  .option('-p, --pages <number>', 'How many pages to scrape')
  .option('-i, --insecure', 'Allow running of scripts')
  .parse(process.argv)

// create runner
let runner = Object.create(Runner)
runner.init(merge(config, cli))

id (config.web) {
  require('./web/app.js')(scraper)
} else {
  scraper.scrape()
}
