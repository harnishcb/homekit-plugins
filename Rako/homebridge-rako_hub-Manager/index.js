var Service, Characteristic;
var net = require('net');
var server_socket = [];
module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-rako_hub-Manager", "Rako_Hub-Manager", rako);
}
function rako(log, config)
{
   /* Mandatory Parameters */
   this.ip = config["IP-Address"];
   this.log = log;
}

rako.prototype.accessories = function(callback){

	var results = [];
	const rako_hub_ip = this.ip;
	let client = new net.Socket();
	const server = new net.Server();

    server.on('connection', function(socket) {
		console.log('A new connection has been established.');
		server_socket.push(socket);
		socket.on('data', function(chunk) {
			console.log('Data received from client',chunk);
		});

		socket.on('end', function() {
			console.log('Closing connection with the client');
		});

		socket.on('error', function(err) {
			console.log('Error',err);
		});
	});


    server.listen(9762, function() {
		console.log('Server listening for connection requests on socket localhost');
	});

    client.connect(9762,  rako_hub_ip, function() {
	 client.write('SUB,JSON,{"version": 2, "client_name": "Cuedesk", "subscriptions": ["TRACKER"] }\r\n');
	 console.log('Manger Platform Connected to Rako Hub');
    });

    client.on('data', function(data) {
		data = data.toString();
	   console.log('data receiver from server',data);
       for(var i=0;i<server_socket.length;i++){
		server_socket[i].write(data);
	   }
    });

    client.on('close', function() {
	console.log('Switch Platform Disconnected from Device Manager');
    });

    client.on('error', function(err) {
       console.log('err=',err)
	   setTimeout(() => client.connect({ port: 9672, host: rako_hub_ip }), 5000);
    });
 callback(results)
}