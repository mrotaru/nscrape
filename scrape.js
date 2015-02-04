process.env.DEBUG='*';
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));
var fs = require('fs');
var nconf = require('nconf');
var program = require('commander');
var path = require('path');
var _ = require('lodash');

var Spider = require('./spider.js');
var Pipeline = require('./Pipeline.js');

var spider_path = ('./spiders');

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

program
  .version('0.0.2')
  .option('--web', 'Start the web interface', 'false')
  .option('-v, --verbose', 'Verbose output')
  .option('-d, --debug', 'Print debug info', 'false')
  .option('--proxy', 'Use a proxy', 'false') // "http://127.0.0.1:8888" for Request
  .option('-f, --filters <names>', 'Filters to use', 'console')
  .option('-w, --wait <ms>', 'Wait between requests', 2000)
  .option('-s, --spider <name>', 'Which spider to run')
  .option('-p, --pages <number>', 'How many pages to scrape', 2)
  .parse(process.argv);

var spider_name =process.argv[2];

nconf.argv()
     .file({file: 'config.json'});

// setup logging
var debug = require('debug');
var log = debug('main');
var error = debug('main:error');
var info = debug('main:info');
error.log = console.error.bind(console);

debug.enable('item');

var extractLinks = program.pages; // by default, scrape 2 pages

function Scraper() {
    this._scrapedLinks = 0;
    this.spiders = [];
    this.init();
}

// return spider with `name`
Scraper.prototype.getSpider = function(name){
    for (var i = 0; i < this.spiders.length; ++i){
        var sname = this.spiders[i].name;
        if(name.indexOf('nsc-') === 0){
            name = name.substring(4);
        }
        if (sname === name) {
            return this.spiders[i];
        }
    }
    return this.spiders[0];
    return null;
}

Scraper.prototype.init = function() {
    var self = this;
    var spider = null;
        
    try {
        var s = new Spider(program.spider);
        self.spiders.push(s);
    } catch (e) {
        log('could not load spider "' + program.spider + '":');
        log(e);
    }
    log(program.spider);
    self.spider = self.getSpider(program.spider);
    if(!self.spider){
        error("No such spider: " + program.spider);
        process.exit(1);
    }
}

/**
 * Scrapes - either the given `url`, or current spider's `nextUrl`
 *
 * @param {string} url which URL to scrape
 */
Scraper.prototype.scrape = function(url){

    info('scrape called with ',url);

    var self = this;
    var spider = self.spider;

    var hasNextUrl = spider.hasNextUrl();
    info('has nextUrl: ', hasNextUrl);
    var needMoreUrls = self._scrapedLinks < extractLinks ? true: false;
    var haveUrlArg = typeof(url) != 'undefined' ? true: false;

    self._scrapedLinks++;

    if(haveUrlArg) {
        self._scrape(url);
    } else if(!haveUrlArg && hasNextUrl && needMoreUrls ) {
        var nextUrl = spider.getNextUrl();
        self._scrape(nextUrl, self.scrape);
    } else if(!haveUrlArg && !hasNextUrl) {
        var url = self.start_url;
        self._scrape(self.spider.baseUrl);
    }
}

Scraper.prototype._scrape = function(url){
    info('_scrape called with ',url);
    if(this.spider.phantom) {
        return this._phantomScrape(url);
    } else {
        return this._requestScrape(url);
    }
}

Scraper.prototype._phantomScrape = function(url){
    var self = this;
    var _phantom = require("phantom");
    _phantom.create(function(phantom){
        if(!phantom) {
            console.log('phantom create failed');
        } else {
            phantom.createPage(function(page){
                page.open(url, function(status){
                    if(status == 'success') {
                        page.evaluate(function(){
                                return document;
                            }, function (result) {
                                var html = result.all[0].innerHTML;
                                phantom.exit();
                                self.spider.parse(html);
                        })
                    } else {
                        console.log("error: page could not be opened");
                    }
                })
            });
        }
    });
}

Scraper.prototype._requestScrape = function(url){

    var self = this;
    var request_options = {
        jar: self.spider.hasOwnProperty('cookies') && self.spider.cookies === true ? true : false
    };
    var spider = self.spider;
    request_options.uri = url;
    request_options.proxy = typeof proxy != 'undefined' ? proxy : null;

    return request.getAsync(request_options).spread(function(resp,body){
        if(resp.statusCode == 200) {
            info('got data back from ', request_options.uri);
            spider.parse(body);
            if(spider.hasNextUrl()) {
                if(program.wait) {
                    return Promise.delay(self,program.wait).then(function(){
                        self.scrape();
                    })
                    info('waiting...' + program.wait);
                } else {
                    self.scrape();
                }
            }
        } else {
            error('request ' + request_options.uri + ' failed - code is: ' + resp.statusCode);
        }
    }).catch(function(err) {
        error('request ' + request_options.uri + ' failed: ');
        error(err);
    });
}

var scraper = new Scraper();

// create a pipeline - load all filters
var pipeline = new Pipeline();
_.each(program.filters.split(','), function (filter) {
    try {
        pipeline.use(filter)
    } catch (ex) {
        error('Could not load filter ' + filter + ': ' + ex)
    }
});

// in cli mode, at least one filter should be loaded
if (pipeline.filters.length === 0 && !program.web) {
    error('No filters - exiting.')
    process.exit(1);
}

// set event listener on each spider - set __template and process
// it with the pipeline
_.each(scraper.spiders, function(spider){
    spider.on("item-scraped", function(item,itemTypeName){
        try {
            pipeline.process(item);
        } catch (e) {
            error('Pipeline could not process: ',e)
        }
    });
})

// web interface
if(program.web){
    require('./web/app.js')(scraper);
} else {
    scraper.scrape();
}
