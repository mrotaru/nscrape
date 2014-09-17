//
// Note: this doesn't work yet !
//
var util         = require("util");

var spider = require('./spider.js');

function Reddit() {
    Reddit.super_.call(this);
    this.name = 'reddit';
    this.baseUrl = 'http://www.reddit.com/r/javascript'
}

util.inherits(Reddit, spider);

Reddit.prototype.nextUrl = function(){
    return {
        css: 'span.nextprev a.next',
        extract: 'href'
    }
}

var reddit = new Reddit();

reddit.addItemType({
    name: "link",
    container: '.sitelisting',
    selector: '.thing',
    properties: {
        title: {
            selector: '.title',
            // extract: 'text' // 'text' is default
        },
        votes: {
            selector: '.score:not(.dislikes):not(.likes)',
        }
    }
});

module.exports = exports = reddit;
