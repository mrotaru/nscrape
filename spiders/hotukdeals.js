var cheerio = require('cheerio');

function hotukdeals(){
    this.name = 'hotukdeals.co.uk';
    this.phantom = true;
};

hotukdeals.prototype.parse = function(html) {
    $ = cheerio.load(html);
    console.log(html);
    $('.redesign-item-listing h2').each(function(i,el){
        console.log(el.text());
    })
}

module.exports = exports = hotukdeals;
