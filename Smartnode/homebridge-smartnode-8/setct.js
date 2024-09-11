
function set_data(data,ip){
const net = require('net');
var client = net.Socket();
console.log(data, ip)
client.connect(13002, ip, function() {
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

module.exports = { set_data }