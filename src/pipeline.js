var util         = require("util");
var Promise      = require("bluebird");
var EventEmitter = require("events").EventEmitter;
var _            = require("lodash");

function Pipeline() {
    EventEmitter.call(this);
    this.name = '';
    this.filters = [];
}

util.inherits(Pipeline, EventEmitter);

var log_item = require('debug')('item');
function consoleFilter(item){
    if (item.__template) {
        log_item(_.template(item.__template,item));
    } else {
        log_item(item.title);
    }
    return item;
};

Pipeline.prototype.use = function(filter){
    var self = this;
    console.log('Using filter: ' + filter)
    if(typeof(filter) === 'function'){
        self.filters.push(filter);
    } else if (typeof(filter) === 'object' && filter.filter && typeof filter.filter === 'function') {
        self.filters.push(filter.filter);
    } else if (filter === 'console') {
        self.filters.push(consoleFilter);
    } else {
        self.load(filter);
    }
}

// run `item` through all filters, sequentially. Each filter receives
// the item as returned by the previous filter. Any filter can reject the
// item, so it will not be passed on to the other filters.
Pipeline.prototype.process = function(item){
    var self = this;
    var current = Promise.cast(item);
    for (var k = 0; k < self.filters.length; ++k) {
        current = current.then(self.filters[k]);
    }
    return current;
}

// load a filter from a file
Pipeline.prototype.load = function(filter){
    throw new Error('Not implemented.')
}

module.exports = Pipeline;