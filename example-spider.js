//
// Note: this doesn't work yet !
//

var spider = require('./spider.js');

function reddit() {
    this.name = 'reddit';
    this.baseUrl = 'http://www.reddit.com/r/javascript'
}

util.inherits(reddit, spider);

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
    },
}

reddit.prototype.nextUrl = function(){
    return {
        css: 'span.nextprev a.next',
        extract: 'href'
    }
}

module.exports = exports = reddit;
