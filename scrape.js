var request = require('request');

var spider_path = ('./spiders');

var spider_name =process.argv[2];
var Spider = require(spider_path + '/' + spider_name + '.js');
var spider = new Spider();

var proxy = "http://127.0.0.1:8888"; // will be used by Request

console.log(spider.name);
var start_url = typeof spider.start_url == 'undefined' ? 'http://wwww.' + spider.name : spider.start_url;

console.log('scraping: ', start_url);   

var request_options = {};
request_options.uri = start_url;
request_options.proxy = typeof proxy != 'undefined' ? proxy : null;

request(
    request_options,
    function(err, resp, body) {
       if (!err && resp.statusCode == 200) {
            spider.parse(body);
        }
    }
)
