process.env.DEBUG='*';
var request = require('request');
var fs = require('fs');
var nconf = require('nconf');
var program = require('commander');
var path = require('path');
var _ = require('lodash');

var Spider = require('./spider.js');
var Pipeline = require('./Pipeline.js');

var spider_path = ('./spiders');

//var proxy = "http://127.0.0.1:8888"; // will be used by Request

program
  .version('0.0.1')
  .option('-w, --web', 'Start the web interface')
  .option('-v, --verbose', 'Verbose output')
  .option('-d, --debug', 'Print debug info', 'false')
  .option('-p, --proxy', 'Use a proxy', 'false')
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
//    console.log(self.spiders);
    self.spider = self.spiders[0];
//    self.spiders.push(spider);
//    self.start_url = typeof this.spider.baseUrl == 'undefined' ? 'http://www.' + this.spider.name : this.spider.baseUrl;
}

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
        done = true;
    } else if(!haveUrlArg && hasNextUrl && needMoreUrls ) {
        var nextUrl = spider.getNextUrl();
        self._scrape(nextUrl, self.scrape);
    } else if(!haveUrlArg && !hasNextUrl) {
        var url = self.start_url;
        self._scrape(self.spider.baseUrl);
        done = true;
    } else {
        done = true;
    }
}

Scraper.prototype._scrape = function(url){
    info('_scrape called with ',url);
    if(this.spider.phantom) {
        this._phantomScrape(url);
    } else {
        this._requestScrape(url);
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

    request(
        request_options,
        function(err, resp, body) {
            if (!err && resp.statusCode == 200) {
                info('got data back from ', request_options.uri);
                spider.parse(body);
                if(spider.hasNextUrl()) {
                    self.scrape();
                }
            } else {
                if(err) {
                    error('request ' + request_options.uri + ' failed: ' + err.code);
                }
                if(resp) {
                    error('request ' + request_options.uri + ' failed: ' + resp);
                }
            }
        }
    )
}

var scraper = new Scraper();

var pipeline = new Pipeline();
pipeline.use(function(item){
    return log_item('(' + item.votes + ') ' + item.title);
});

_.each(scraper.spiders, function(spider){
    spider.on("item-scraped", function(item){
        pipeline.process(item);
    });
})

// web interface
if(process.argv[3] === '--web'){
    require('./web/app.js')(scraper);
} else {
    scraper.scrape();
}
