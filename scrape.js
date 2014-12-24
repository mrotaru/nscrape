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

//var proxy = "http://127.0.0.1:8888"; // will be used by Request

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

program
  .version('0.0.1')
  .option('-w, --web', 'Start the web interface')
  .option('-v, --verbose', 'Verbose output')
  .option('-d, --debug', 'Print debug info', 'false')
  .option('-p, --proxy', 'Use a proxy', 'false')
  .option('-w, --wait <ms>', 'Wait between requests', 2000)
  .option('-s, --spider <name>', 'Which spider to run')
  .parse(process.argv);

var spider_name =process.argv[2];

nconf.argv()
     .file({file: 'config.json'});

// setup logging
var debug = require('debug');
var log = debug('main');
var log_item = debug('item');
var error = debug('main:error');
var info = debug('main:info');
error.log = console.error.bind(console);

debug.enable('item');

var extractLinks = 2; // by default, scrape 2 pages

function Scraper() {
    this._scrapedLinks = 0;
    this.spiders = [];
    this.init();
}

Scraper.prototype.getSpider = function(name){
    for (var i = 0; i < this.spiders.length; ++i){
        if (this.spiders[i].name === name) {
            return this.spiders[i];
        }
    }
    return null;
}

Scraper.prototype.init = function() {
    var self = this;
    var spider = null;
        
    var nscRegex = /^nsc-[a-z1-9\-]+$/
    _.each(fs.readdirSync('./node_modules/').filter(function(file){
        try {
            return file.match(nscRegex) && fs.statSync('./node_modules/' + file).isDirectory();
        } catch(e) {
            return false;
        }
    }),function(spider){
        try {
            var s = new Spider(path.basename(path.join('./node_module',spider)));
            self.spiders.push(s);
        } catch(e) {
            log('could not load spider "' +  spider + '":');
            log(e);
        }
    });
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
    var request_options = {};
    var spider = self.spider;
    request_options.uri = url;
    request_options.proxy = typeof proxy != 'undefined' ? proxy : null;

    return request.getAsync(request_options).spread(function(resp,body){
        if(resp.statusCode == 200) {
            info('got data back from ', request_options.uri);
            spider.parse(body);
            if(spider.hasNextUrl()) {
                if(program.wait) {
                    info('waiting...' + program.wait);
                    return Promise.delay(self,program.wait).then(function(){
                        self.scrape();
                    })
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

var pipeline = new Pipeline();
pipeline.use(function(item){
//    console.log(item);
    if(item.__type.template) {
//        console.log(item.__type.template);
//        console.log(item);
        return log_item(_.template(item.__type.template,item));
    } else {
        return log_item(item.title);
    }
});

_.each(scraper.spiders, function(spider){
    spider.on("item-scraped", function(item,itemTypeName){
        _.each(spider.itemTypes, function(itemType){
            if(itemTypeName === itemType.name){
                item.__type = itemType;
            }
        });
        pipeline.process(item);
    });
})

// web interface
if(process.argv[3] === '--web'){
    require('./web/app.js')(scraper);
} else {
    scraper.scrape();
}
