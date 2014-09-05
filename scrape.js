var request = require('request');
var fs = require('fs');
var winston = require('winston');

var spider_path = ('./spiders');

var proxy = "http://127.0.0.1:8888"; // will be used by Request

var spider_name =process.argv[2];
var extractLinks = 2; // by default, extract 2 more links to be parsed

// setup logging
winston.loggers.add('scraper', {
    console: {
        level: 'info',
        colorize: 'true',
        label: 'scraper'
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

function Scraper(spider_name) {
    this.init(spider_name);
    this._scrapedLinks = 0;
}

Scraper.prototype.init = function(spider_name) {
    var Spider = null;
    log.log('info','initializing scraper: %s', spider_name);
    // try to load spider from local dir
    var localPath = spider_path + '/' + spider_name;
    if(fs.existsSync(localPath)) {
        log.log('info','loading scraper %s from ', spider_name, localPath);
        Spider = require(localPath);
    } else {
        log.log('info','loading scraper %s from ', spider_name, spider_name + '-spider');
        Spider = require('./node_modules/' + spider_name + '-spider');
    }
    this.spider = new Spider();
    this.start_url = typeof this.spider.start_url == 'undefined' ? 'http://www.' + this.spider.name : this.spider.start_url;
}

Scraper.prototype.scrape = function(url){
    var url = typeof url == 'undefined' ? this.start_url : url;
    var done = false;
    while(!done) {
        log.log('info','scraping: %s', url);
        this._scrapedLinks++;
        if(typeof this.spider.nextUrl == 'function' && this._scrapedLinks < extractLinks ) {
            this._scrape(this.spider.nextUrl(), this.scrape);
        } else if(typeof(this.spider.nextUrl === 'undefined')) {
            this._scrape(this.spider.baseUrl);
            done = true;
        } else {
            console.log('enough');
            done = true;
        }
    }
}

Scraper.prototype._scrape = function(url, callback){
    if(this.spider.phantom) {
        this._phantomScrape(url, callback);
    } else {
        this._requestScrape(url, callback);
    }
}

Scraper.prototype._phantomScrape = function(url, callback){
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

Scraper.prototype._requestScrape = function(url, callback){

    var request_options = {};
    request_options.uri = url;
    request_options.proxy = typeof proxy != 'undefined' ? proxy : null;

    var self = this;
    request(
        request_options,
        function(err, resp, body) {
            if (!err && resp.statusCode == 200) {
                log.log('info', 'got data back from %s', request_options.uri);
                self.spider.parse(body);
                if(typeof self.spider.nextUrl == 'function' && tupeof(callback) == 'function' ) {
                    callback(self.spider.nextUrl());
                }
            } else {
                if(err) {
                    log.log('error', 'request failed: %s', err.code);
                }
                if(resp) {
                    log.log('error', 'request failed; resp: %s', resp);
                }
            }
        }
    )
}

var scraper = new Scraper(spider_name);
scraper.spider.on("item-scraped", function(item){
    console.log(item.title);
});
scraper.scrape();
