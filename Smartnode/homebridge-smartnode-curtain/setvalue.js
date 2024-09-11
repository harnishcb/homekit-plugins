var net = require('net');
var val=0;
var client = new net.Socket();
client.connect(13002, '192.168.1.232', function() {
	console.log('Connected from outside');
});
client.on('data', function(data) {
	console.log('Received: ' + data);
});
client.on('close', function() {
	console.log('Connection closed');
});

function test(data){
	val = data;
	setTimeout(() => client.write(val),750);
}

module.exports = { test }