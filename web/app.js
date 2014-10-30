var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.engine('jade', require('jade').__express);
app.set('views', './web')
app.set('view engine', 'jade')
app.use(express.static(__dirname + '/web'));

app.get('/', function (req, res) {
    res.render('index');
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

