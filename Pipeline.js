var util         = require("util");
var Promise      = require("bluebird");
var EventEmitter = require("events").EventEmitter;

function Pipeline() {
    EventEmitter.call(this);
    this.name = '';
    this.filters = [];
}

util.inherits(Pipeline, EventEmitter);

Pipeline.prototype.use = function(filter){
    var self = this;
    if(typeof(filter) === 'function'){
        self.filters.push(filter);
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
}

module.exports = Pipeline;
