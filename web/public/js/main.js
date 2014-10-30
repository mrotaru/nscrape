var socket = io.connect('http://localhost');
$(document).ready(function() {
    $('#start').click(function(){
        console.log('starting');
        socket.emit('start', { my: 'data'});
        return false;
    });
});

socket.on('item-scraped', function(item){
    console.log('item: ',item);
    $('#items').append($('<li>').text(item.title));
});

socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', { my: 'data' });
});
