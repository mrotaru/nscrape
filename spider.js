var cheerio      = require('cheerio');
var util         = require("util");
var EventEmitter = require("events").EventEmitter;
var Promise      = require('bluebird');
var ZSchema      = require("z-schema");

var validator       = require("validator");
var beautify        = require("js-beautify");

var schemaValidator = new ZSchema();
var ee              = new EventEmitter();

var _      = require('lodash');
var _debug = require('debug');
var log = _debug('spider');
var error = _debug('spider:error');
var debug = _debug('spider:debug');
error.log = console.error.bind(console);

function Spider(fileName){
    EventEmitter.call(this);

    if(fileName){

//        var suffix = '.json';
//        if(fileName.indexOf(suffix, fileName.length - suffix.length) !== -1){
//        } else if(fileName.indexOf('nsc-') === 0){
//            fileName = fileName.substring(4);
//        }

        log('validating JSON spider:', fileName);
        try {
            var instance = require(fileName);
        } catch(e) {
            throw new Error('Require failed: \n' + e);
        }
        var schema = require("./schemas/spider-v1.json");
        var valid = schemaValidator.validate(instance, schema);
        if(!valid) {
            error('Spider is not valid');
            var errors = schemaValidator.getLastErrors();
            for (var i=0; i < errors.length; ++i) {
                error(i+1, ': (', errors[i].path, ') ', errors[i].message);
            }
            process.exit(1);
        }
        log('validity: OK');
        log('loading JSON spider ', fileName);
        var j = require(fileName);
        this.name = j.name;
        this.baseUrl = j.baseUrl;
        this.itemTypes = j.itemTypes;
        if(j.sanitizers) this.sanitizers = j.sanitizers;
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

Spider.prototype.setItemType = function(itemType){
    this.itemTypes = [itemType];
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
    } else if(descriptor.hasOwnProperty('sfunction')){
        // parse function and run in the context of `ctx`
        var f = new Function('var $ = arguments[0]; ' + descriptor.sfunction);
        return f.apply(ctx, [self.$]);
    } else if(!descriptor.selector){
        throw new Error('Descriptor does not have a `selector` property');
    } else {
        selector = descriptor.selector;
    }

    el = self.$(ctx).find(selector);
    //debug(el);
    if(!el.length) {
        if(typeof(descriptor) === 'object' && descriptor.optional) {
            debug('optional property element not found: %s setting to null', ret);
            return null;
        } else {
            throw new Error('Cannot find: ' + selector + ' in: ' + beautify(self.$(ctx).html(),{preserve_newlines: false}));
        }
    }
    
//    debug('selector: %s', selector);

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
//    debug('extracted: %s', ret);

    // sanitizers
    if(self.sanitizers) {
        if(typeof self.sanitizers === 'object' && Array.isArray(self.sanitizers)) {
            _.each(self.sanitizers, function(sanitizer){
                if(typeof validator[sanitizer] === 'function') {
                    ret = validator[sanitizer](ret);
                    // console.log('after sanitizer "' + sanitizer + '": ',ret);
                } else {
                    console.log('Cannot find sanitizer: ',sanitizer);
                }
            })
        } else {
            throw('sanitizers must be array');
        }
    } else {
    }

    return ret;
}

Spider.prototype.parse = function(html) {
    log('parsing %d bytes', html.length);

    var self = this;
    self._html = html;
    var $ = self.$ = cheerio.load(html,{
        normalizeWhitespace: false,
        xmlMode: false,
        decodeEntities: true
    });

    self.itemTypes.forEach(function(itemType){

        log('extracting \'%s\' items', itemType.name);

        var containerSelector = itemType.container || 'body';
        log('container: %s', containerSelector);
        log('selector: %s', itemType.selector);
        var itemsScraped = 0;

        var container = $(containerSelector);
        if(!container.length) {
            throw new Error('Container not found: '+ containerSelector);
        }

        // exclude
        var excluded = 0;
        var itemsDom = container.find(itemType.selector);
        if(itemType.exclude) {
            itemsDom = $(itemsDom).filter(function(index){
                var shouldExclude = $(this).is(itemType.exclude);
                if(shouldExclude) {
                    log('excluding: ' + $(this).text().replace(/\s+/g, ' '));
                    ++excluded;
                    return false;
                }
                return true;
            });
        }

        // extract and emit event with item
        itemsDom.each(function(i,el){
            var item = {};
            var failedToExtractProperty = false;

            if (itemType.template) {
                item.__template = itemType.template;
            }

            for (var prop in itemType.properties) {

                var isFunc = itemType.properties[prop].hasOwnProperty('sfunction');

                if(!isFunc && typeof itemType.properties[prop] === 'object' && !itemType.properties[prop].selector) {
                    throw new Error('Descriptor does not have a `selector` property');
                }

                try {
                    item[prop] = self.extract(itemType.properties[prop], el);
                } catch(e) {
                    //throw new Error('Failed to extract: ' + e.toString());
                    log("failed to extract: ",e);
                    failedToExtractProperty = true;
                    break;
                }
            }
            if(!failedToExtractProperty) {
                self.items.push(item);
                self.emit("item-scraped",item,itemType.name);
                itemsScraped++;
            }
        })

        if(!itemsScraped) {
            log('no items were scraped.');
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
    log('getting nextUrl');
    if(self.nextUrl) return self.nextUrl();
    if(self.currentPage === null) {
        self.currentPage = 1;
        log('setting currentPate to 1');
        return self.baseUrl;
    } else {
        log('currentPage: %s', self.currentPage);
        self.currentPage = self.currentPage+1;
        if(self.hasOwnProperty('nextUrlDescriptor')){
            var ret = self.extract(self.nextUrlDescriptor);
            log('nextUrl: ', ret);
            return ret;
        } else {
            return null;
        }
    }
}

module.exports = exports = Spider;
