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

Spider.prototype.extract = function(el, descriptor){
    var self = this;
    var css = descriptor.css;
    log.info('info','extracting %s', css);
    var what = 'extract' in descriptor ? descriptor.extract : 'text';
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
    self.$ = cheerio.load(html);

    self.itemTypes.forEach(function(itemType){
        log.info('extracting \'%s\' items', itemType.name);
        log.info('container: ', itemType.container);
        log.info('selector: ', itemType.selector);
        var itemsScraped = 0;
        self.$(itemType.container).find(itemType.selector).each(function(i,el){
            var item = {};
            for (var prop in itemType.properties) {
                item[prop] = self.extract(el, itemType.properties[prop]);
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
        log.info('info','setting currentPate to 1');
        return self.baseUrl;
    } else {
        log.info('currentPage: %s', self.currentPage);
        self.currentPage = self.currentPage+1;
        if(self.hasOwnProperty('nextUrlDescriptor')){
            return self.extract(self.$('body'), self.nextUrlDescriptor);
        } else {
            return null;
        }
    }
}

module.exports = exports = Spider;
