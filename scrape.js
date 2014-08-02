var request = require('request');

var spider_path = ('./spiders');

var spider_name =process.argv[2];
var Spider = require(spider_path + '/' + spider_name + '.js');
var spider = new Spider();

//var proxy = "http://127.0.0.1:8888"; // will be used by Request

// start url
var start_url = typeof spider.start_url == 'undefined' ? 'http://www.' + spider.name : spider.start_url;
console.log('scraping: ', start_url);   

if(spider.phantom) {
    var _phantom = require("phantom");
    _phantom.create(function(phantom){
        if(!phantom) {
            console.log('phantom create failed');
        } else {
            phantom.createPage(function(page){
                page.open(start_url, function(status){
                    if(status == 'success') {
                        page.evaluate(function(){
                                return document;
                            }, function (result) {
                                var html = result.all[0].innerHTML;
                                phantom.exit();
                                spider.parse(html);
                        })
                    } else {
                        console.log("error: page could not be opened");
                    }
                })
            });
        }
    });
} else {

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
}
