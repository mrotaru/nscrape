var request = require('request');
var fs = require('fs');
var winston = require('winston');

var spider_path = ('./spiders');

//var proxy = "http://127.0.0.1:8888"; // will be used by Request

var spider_name =process.argv[2];
var extractLinks = 2; // by default, scrape 2 pages

// setup logging
winston.loggers.add('scraper', {
    console: {
        level: 'info',
        colorize: 'true',
        label: 'scraper',
    }
});

winston.loggers.add('item', {
    console: {
        level: 'info',
        colorize: 'true',
        label: 'item',
    }
});

winston.loggers.add('spider', {
    console: {
        level: 'info',
        colorize: 'true',
        label: 'spider'
    }
});

var log = winston.loggers.get('scraper');
var log_item = winston.loggers.get('item');
winston.addColors({info: 'grey'});

function Scraper(spider_name) {
    this.init(spider_name);
    this._scrapedLinks = 0;
}

Scraper.prototype.init = function(spider_name) {
    var self = this;
    var Spider = null;
    if(fs.existsSync('./' + spider_name)){
        Spider = require('./' + spider_name);
    } else {
        // try to load spider from local dir
        var localPath = spider_path + '/' + spider_name;
        if(fs.existsSync(localPath)) {
            log.log('info','loading spider %s from ', spider_name, localPath);
            Spider = require(localPath);
        } else {
            log.log('info','trying to load spider %s from ', spider_name, spider_name + '-spider');
            try {
                Spider = require('./node_modules/' + spider_name + '-spider');
            } catch(e){
                log.error('could not load spider "%s": %s', spider_name, e.code);
                process.exit(1);
            }
        }
    }
    self.spider = Spider;
    self.start_url = typeof this.spider.start_url == 'undefined' ? 'http://www.' + this.spider.name : this.spider.start_url;
}

Scraper.prototype.scrape = function(url){

    log.info('scrape called with %s',url);

    var self = this;
    var spider = self.spider;

    var hasNextUrl = spider.hasNextUrl();
    log.info('has nextUrl: ', hasNextUrl);
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
    log.info('_scrape called with %s',url);
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
                log.info('got data back from %s', request_options.uri);
                spider.parse(body);
                if(spider.hasNextUrl()) {
                    self.scrape();
                }
            } else {
                if(err) {
                    log.error('request [%s] failed: %s', request_options.uri, err.code);
                }
                if(resp) {
                    log.error('request [%s] failed; resp: %s', request_options.uri, resp);
                }
            }
        }
    )
}

var scraper = new Scraper(spider_name);
scraper.spider.on("item-scraped", function(item){
    log_item.info('%j',item, {});
});
scraper.scrape();
