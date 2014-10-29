var cheerio      = require('cheerio');
var util         = require("util");
var EventEmitter = require("events").EventEmitter;
var Promise      = require('bluebird');
var ZSchema      = require("z-schema");

var validator    = new ZSchema();
var ee           = new EventEmitter();

var log = require('minilog')('spider');
require('minilog').enable();

function Spider(fileName){
    EventEmitter.call(this);

    if(fileName){
        log.info('validating JSON spider:', fileName);
        var instance = require("./" + fileName);
        var schema = require("./schemas/spider-v1.json");
        var valid = validator.validate(instance, schema);
        if(!valid) {
            log.error('Spider is not valid');
            var errors = validator.getLastErrors();
            for (var i=0; i < errors.length; ++i) {
                log.error(i+1, ': (', errors[i].path, ') ', errors[i].message);
            }
            process.exit(1);
        }
        log.info('validity: OK');
        log.info('loading JSON spider ', fileName);
        var j = require('./' + fileName);
        this.name = j.name;
        this.baseUrl = j.baseUrl;
        this.itemTypes = j.itemTypes;
        if(j.nextUrlDescriptor) {
            this.nextUrlDescriptor = j.nextUrlDescriptor;
        }
    } else {
        this.name = '';
        this.baseUrl = '';
        this.itemTypes = [];
    }

    // runtime
    this.items = [];
    this._html = null;
    this.$ = null;
    this.currentPage = null;
};

util.inherits(Spider, EventEmitter);

Spider.prototype.addItemType = function(itemType){
    this.itemTypes.push(itemType);
}

// descriptor has the following format:
// 1) a string - used as selector to find text in `ctx`
// 2) an object
//      Must have a `selector` property. Other, optional properties:
//      - extract - one of: "text" (default) or "href"
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

    el = self.$(ctx).find(selector);
    //log.debug(el);
    if(!el.length) {
        if(typeof(descriptor) === 'object' && descriptor.optional) {
            log.debug('optional property element not found: %s setting to null', ret);
            return null;
        } else {
            throw new Error('Cannot find: ' + selector);
        }
    }
    
    log.debug('selector: ', selector);

    var ret = null;
    var what = '';
    if(typeof(descriptor) === 'string'){
        what = 'text';
    } else {
        what = 'extract' in descriptor ? descriptor.extract : 'text';
    }

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
    log.debug('extracted: ', ret);
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
