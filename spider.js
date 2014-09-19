var cheerio      = require('cheerio');
var util         = require("util");
var EventEmitter = require("events").EventEmitter;
var winston      = require('winston');
var ee           = new EventEmitter();

var log = winston.loggers.get('spider');

function Spider(){
    EventEmitter.call(this);
    this.name = '';
    this.baseUrl = '';
    this.items = [];
    this.itemTypes = [];
    this._html = null;
    this.$ = null;
    this.currentPage = null;
};

util.inherits(Spider, EventEmitter);

Spider.prototype.addItemType = function(itemType){
    this.itemTypes.push(itemType);
}

// 1 arg: descriptor, use self.$ as ctx
Spider.prototype.extract = function(descriptor, ctx){
    var self = this;
    var args = Array.prototype.slice.call(arguments);
    var descriptor = args.shift();
    var ctx = args.shift() || self.$;
    var selector = descriptor.selector
    var what = 'extract' in descriptor ? descriptor.extract : 'text';

//    el = self.$(ctx).find(selector);
    
    el = ctx.find(selector);
    
    log.debug('extracting %s', selector);

    switch (what) {
        case 'href':
            return el.attr('href');
            break;
        case 'text':
            return el.text();
            break;
        default:
            return null;
    }
}

Spider.prototype.parse = function(html) {
    log.info('parsing %d bytes', html.length);

    var self = this;
    self._html = html;
    var $ = self.$ = cheerio.load(html);

    self.itemTypes.forEach(function(itemType){

        log.info('extracting \'%s\' items', itemType.name);

        var containerSelector = itemType.container || 'body';
        log.info('container: ', containerSelector);
        log.info('selector: ', itemType.selector);
        var itemsScraped = 0;

        var container = $(containerSelector);
        if(!container.length) {
            log.error('Container not found: "%s"', containerSelector);
            process.exit(1);
        }

        container.find(itemType.selector).each(function(i,el){
            var item = {};
            for (var prop in itemType.properties) {
                item[prop] = self.extract(itemType.properties[prop], el);
            }

            self.items.push(item);
            self.emit("item-scraped",item);
            itemsScraped++;
        })

        if(!itemsScraped) {
            log.warn('no items were scraped.');
        }
    });
}

Spider.prototype.hasNextUrl = function(){
    return this.hasOwnProperty('nextUrlDescriptor') || this.hasOwnProperty('nextUrl');
}

// Get the url to the next page
Spider.prototype.getNextUrl = function() {
    var self = this;
    log.info('getting nextUrl');
    if(self.nextUrl) return self.nextUrl();
    if(self.currentPage === null) {
        self.currentPage = 1;
        log.info('setting currentPate to 1');
        return self.baseUrl;
    } else {
        log.info('currentPage: %s', self.currentPage);
        self.currentPage = self.currentPage+1;
        if(self.hasOwnProperty('nextUrlDescriptor')){
            var ctx = self.$('body');
            console.log(self.nextUrlDescriptor);
            var ret = self.extract(self.nextUrlDescriptor);
            log.info('nextUrl: ', ret);
            return ret;
        } else {
            return null;
        }
    }
}

module.exports = exports = Spider;
