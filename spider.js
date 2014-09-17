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

Spider.prototype.parse = function(html) {
    log.info('parsing %d bytes', html.length);
    var self = this;
    self._html = html;
    self.$ = cheerio.load(html);

    itemTypes.forEach(function(itemType){
        log.info('extracting \'%s\' items', itemType.name);
        self.$(itemType.container).find(itemType.selector).each(function(i,el){
            var item = {};
            for (var prop in itemType.properties) {
                item[prop] = self.$(el).find(itemType.properties.prop.selector).text();
            }

            item.title = self.$(this).text();
            self.items.push(item);
            self.emit("item-scraped",item);
        })
    });
}

// Get the url to the next page
Spider.prototype.nextUrl = function() {
    var self = this;
    if(self.currentPage === null) {
        self.currentPage = 1;
        log.info('info','setting currentPate to 1');
        return self.baseUrl;
    } else {
//        this.currentPage = parseInt(this.$('.redesign-pagination selected').text());
        log.info('currentPage: %s', self.currentPage);
        self.currentPage = self.currentPage+1;
        return this.baseUrl + '/?page=' + self.currentPage.toString();
    }
}

module.exports = exports = Spider;
