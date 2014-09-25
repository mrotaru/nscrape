var util         = require("util");
var Promise      = require("bluebird");
var EventEmitter = require("events").EventEmitter;

function Pipeline() {
    EventEmitter.call(this);
    this.name = '';
    this.filters = [];
}

Pipeline.prototype.use = function(filter){
    var self = this;
    if(typeof(filter) === 'function'){
        filters.push(filter);
    } else {
        self.load(filter);
    }
}

Pipeline.prototype.process = function(item){
    // run `item` through all filters, sequentially. Each filter receives
    // the item as returned by the previous filter. Any filter can reject the
    // item, so it will not be passed on to the other filters.
}

util.inherits(Pipeline, EventEmitter);

module.exports.Pipeline = Pipeline;
