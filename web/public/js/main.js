var socket = io.connect('http://localhost');
$(document).ready(function() {
    $('#start').click(function(){
        console.log('starting');
        socket.emit('start', { spider: $(this).data('spider-name')});
        return false;
    });
});

socket.on('item-scraped', function(item){
    console.log('item: ',item);
    $('#items').append($('<li>').text(item.title));
});
