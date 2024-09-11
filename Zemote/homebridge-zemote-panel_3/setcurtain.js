var net = require('net');
function set(data,ip){
var client = new net.Socket();

client.connect(50505,ip , function() {
	console.log('Connected from outside');
	client.write(data);
});
client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy();
});
client.on('close', function() {
	console.log('Connection closed');
});
}

module.exports = { set }