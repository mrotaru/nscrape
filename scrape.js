var request = require('request');
var fs = require('fs');
var nconf = require('nconf');
var program = require('commander');

var Spider = require('./spider.js');
var Pipeline = require('./Pipeline.js');

var spider_path = ('./spiders');

//var proxy = "http://127.0.0.1:8888"; // will be used by Request

program
  .version('0.0.1')
  .option('-w, --web', 'Start the web interface')
  .option('-v, --verbose', 'Verbose output')
  .option('-d, --debug', 'Print debug info', 'false')
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

var extractLinks = 2; // by default, scrape 2 pages

function Scraper(spider_name) {
    this.init(spider_name);
    this._scrapedLinks = 0;
}

Scraper.prototype.init = function(spider_name) {
    var self = this;
    var spider = null;
    try {
        if(fs.existsSync('./' + spider_name)){
            if(spider_name.indexOf('.json', spider_name.length - ".json".length) !== -1) {
                spider = new Spider(spider_name);
            } else {
                spider = require('./' + spider_name);
            }
        } else {
            // try to load spider from local dir
            var localPath = spider_path + '/' + spider_name;
            if(fs.existsSync(localPath)) {
                info('loading spider ' + spider_name + ' from ' + localPath);
                spider = require(localPath);
            } else {
                info('trying to load spider ' + spider_name + ' from ' + localPath + '-spider');
                spider = require('./node_modules/' + spider_name + '-spider');
            }
        }
    } catch(e) {
        log('could not load spider "' +  spider_name + '":');
        log(e.toString());
        process.exit(1);
    }
    self.spider = spider;
    self.start_url = typeof this.spider.baseUrl == 'undefined' ? 'http://www.' + this.spider.name : this.spider.baseUrl;
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

var scraper = new Scraper(spider_name);

var pipeline = new Pipeline();
pipeline.use(function(item){
    return log_item('(' + item.votes + ') ' + item.title);
});

scraper.spider.on("item-scraped", function(item){
    pipeline.process(item);
});

// web interface
if(process.argv[3] === '--web'){
    require('./web/app.js')(scraper);
} else {
    scraper.scrape();
}
