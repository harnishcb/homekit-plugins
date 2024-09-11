const net = require('net');

var client = net.Socket();

client.connect(6000, "localhost", function() {
	console.log('Connected from outside');
});

client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy();
});

client.on('close', function() {
	console.log('Connection closed');
	client.connect(6000, "localhost");
});

client.on('error', function() {
	console.log('Connection error');
});

function set_data(addr,val){
 client.write(JSON.stringify({ addr: addr , value: val }));
}

module.exports = { set_data }