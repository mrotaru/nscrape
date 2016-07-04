var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

function start(scraper) {
    app.engine('jade', require('jade').__express);
    app.set('views', './web/views')
    app.set('view engine', 'jade')
    app.use(express.static(__dirname + '/public'));

    app.get('/', function (req, res) {
        console.log(scraper.spiders);
        res.render('index', {spiders: scraper.spiders});
    })

    scraper.spider.on("item-scraped", function(item){
        io.emit("item-scraped", item);
    });

    io.on('connection', function (socket) {
        socket.on('start', function(socket){
            console.log('start from web interface');
            scraper.scrape();
        });
    });

    server.listen(80, function(){
        console.log('listening on *:80');
    });
}

module.exports = start;
