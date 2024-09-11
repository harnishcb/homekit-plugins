var Service, Characteristic;
var net = require('net');
var HDL_bus = require('./node_modules/smart-bus');
var socket_feedback = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-hdl-pro-manager", "HDL_Pro-Manager", HDl_Pro);
}

function HDl_Pro(log, config)
{
   /* Mandatory Parameters */
   this.ip = config["IP-Address-of-HDL-Pro-Gateway"];
   this.port = config["Port-of-HDL-Pro-Gateway"];
   this.controller_device = config["Controller"];
   this.log = log;
}

HDl_Pro.prototype.accessories = function(callback){

	var results = [];
	const Bus_IP = this.ip;
	const Bus_Port = this.port;
	const server_trigger = new net.Server();
	const server_feedback = new net.Server();

//---------------------- TRIGGER SERVER --------------------------------------------//
    server_trigger.on('connection', function(socket_trigger) {
		console.log('A new connection has been established to HDL Pro Trigger Server.');
		socket_trigger.on('data', function(data) {
			console.log('Data received from client to HDL Pro Trigger Server',data.toString());
			data = JSON.parse(data);
			send_hdl_bus(hdl_bus,controller, data.addr, data.value);
		});
		socket_trigger.on('end', function() {
			console.log('Closing connection with the client for HDL Pro Trigger Server');
		});
		socket_trigger.on('error', function(err) {
			console.log('Error',err);
		});
	});

    server_trigger.listen(6000, function() {
		console.log('HDL Pro server_trigger listening for connection requests on socket localhost');
	});
//__________________________________________________________________________________________//



//------------------- FEEDBACK Server -------------------------------------------//
server_feedback.on('connection', function(socket_fb) {
	console.log('A new connection has been established to HDL Pro to server_feedback.');
	socket_feedback.push(socket_fb);
	socket_fb.on('data', function(data) {
		console.log('Data received from HDL Pro Feedback Server',data);
	});
	socket_fb.on('end', function() {
		console.log('Closing connection with the client for HDL Pro Feedback Server');
	});
	socket_fb.on('error', function(err) {
		console.log('Error',err);
	});
});

server_feedback.listen(6001, function() {
	console.log('HDL Pro server_feedback listening for connection requests on socket localhost');
});
//__________________________________________________________________________________________//


/*//==========================================================================================//
                          HDL Bus CONNECTION
//============================================================================================*/

var hdl_bus = new HDL_bus('hdl://'+Bus_IP+':'+Bus_Port);
var controller = hdl_bus.controller(this.controller_device.replace("/","."));


hdl_bus.on(0x0032, function(command) {
  var data = command.data;
  var group_id =  String(command.sender.subnet)+"/"+String(command.sender.id)+"/"+String(data.channel);
  console.log("Device ID:", group_id, "is set at level:" , data.level,"with success status:", data.success);
  var data_rec = {"device_addr": group_id, "value": data.level }
  for (var i=0; i < socket_feedback.length; i++){
	 socket_feedback[i].write(JSON.stringify(data_rec));
  }
});


function send_hdl_bus(hdl_bus, controller, device, val){
	var chn = device.slice(device.lastIndexOf("/")+1,);
	var subnet_device = device.slice(0,device.lastIndexOf("/")).replace("/",".");
	var HDL_HAP = hdl_bus.device(subnet_device);
	controller.send({
		target: HDL_HAP,
		command: 0x0031,
		data: { channel: chn, level: val }
	  }, function(err) {
		if (err) console.error('Failed to send command', HDL_HAP);
		else console.log('Sent command 0x0031 to %s', HDL_HAP);
	  });
}

 callback(results)
}