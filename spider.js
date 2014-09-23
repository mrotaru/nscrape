var cheerio      = require('cheerio');
var util         = require("util");
var EventEmitter = require("events").EventEmitter;
var winston      = require('winston');
var Promise      = require('bluebird');
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
    var ctx = args.shift() || 'body';

    var selector = '';
    if(typeof(descriptor) === 'string') {
        selector = descriptor;
    } else {
        if(!descriptor.selector){
            throw new Error('Descriptor does not have a `selector` property');
        }
        selector = descriptor.selector;
    }

    var what = '';
    if(typeof(descriptor) === 'string'){
        what = 'text';
    } else {
        what = 'extract' in descriptor ? descriptor.extract : 'text';
    }

    el = self.$(ctx).find(selector);
    if(!el.length) {
        log.error('cannot find: ', selector);
        return null;
    }
    
    log.debug('extracting %s', selector);

    var ret = null;
    switch (what) {
        case 'href':
            ret = el.attr('href');
            break;
        case 'text':
            ret = el.text();
            break;
        default:
            ret = null;
    }
    log.debug('extracted: %s', ret);
    return ret;
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
            throw new Error('Container not found: '+ containerSelector);
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
    return Promise.resolve(self.items);
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
            var ret = self.extract(self.nextUrlDescriptor);
            log.info('nextUrl: ', ret);
            return ret;
        } else {
            return null;
        }
    }
}

module.exports = exports = Spider;
