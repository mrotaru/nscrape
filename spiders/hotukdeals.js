var cheerio      = require('cheerio');
var util         = require("util");
var EventEmitter = require("events").EventEmitter;
var ee           = new EventEmitter();

function hotukdeals(){
    EventEmitter.call(this);
    this.items = [];
    this.name = 'hotukdeals.com';
};

util.inherits(hotukdeals, EventEmitter);

hotukdeals.prototype.parse = function(html) {
    $ = cheerio.load(html);
    var self = this;
    $('.redesign-item-listing h2').each(function(i,el){
        var item = {};
        item.title = $(this).text();
        self.items.push(item);
        self.emit("item-scraped",item);
    })
}

module.exports = exports = hotukdeals;
