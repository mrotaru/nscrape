var cheerio = require('cheerio');

function hotukdeals(){
    this.name = 'hotukdeals.com';
};

hotukdeals.prototype.parse = function(html) {
    $ = cheerio.load(html);
    $('.redesign-item-listing h2').each(function(i,el){
        console.log($(this).text());
    })
}

module.exports = exports = hotukdeals;
