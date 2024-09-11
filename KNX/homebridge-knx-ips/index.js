var Service, Characteristic;
var net = require('net');
var socket_feedback = [];
const KnxConnectionTunneling = require('knx.js').KnxConnectionTunneling;
var convert = require('./conversion.js');
var ip = require('ip');


module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-knx-ips", "KNX-IP_Interface", knx);
}
function knx(log, config)
{
   /* Mandatory Parameters */
   this.ip = config["IP-Address-of-KNX-Gateway"];
   this.log = log;
}

knx.prototype.accessories = function(callback){

	var results = [];
	const knx_ip = this.ip;
	const server_trigger = new net.Server();
	const server_feedback = new net.Server();
    const log = this.log;

//---------------------- TRIGGER SERVER --------------------------------------------//	
    server_trigger.on('connection', function(socket_trigger) {
		log.info('A new connection has been established to trigger server.');
		socket_trigger.on('data', function(data) {
			try {
			data = JSON.parse(data);
			if(data.event == "GroupValue_Write"){
				log.info("GroupValue_Write request to KNX for Group address:", data.destination, ", value", data.value, "and DPT:" ,data.dpt);
			    write(data.destination, data.value, data.dpt);
			}
			else if(data.event == "GroupValue_Read"){
			    log.info("GroupValue_Read request to KNX for Group address:", data.destination);
			    read(data.destination)
			}

			} catch (e){
				log.info('error decoding');
			}
		});
		socket_trigger.on('end', function() {
			log.error('socket_trigger closing connections with the client');
		});
		socket_trigger.on('error', function(err) {
			log.error('socket_trigger error',err);
		});
	});

    server_trigger.listen(3671, function() {
		log.info('server_trigger listening for connection requests on port 3671 at localhost');
	});
//__________________________________________________________________________________________//



//------------------- FEEDBACK Server -------------------------------------------//
server_feedback.on('connection', function(socket_fb) {
	log.info('A new connection has been established to feedback server.');
	socket_feedback.push(socket_fb);
	socket_fb.on('data', function(data) {
		log.warn('Data received to Feedback server',data,'Ideally no data should be triggered to feedback server');
	});
	socket_fb.on('end', function() {
		log.error('socket_fb closing connection with the client');
	});
	socket_fb.on('error', function(err) {
		log.error('socket_fb error',err);
	});
});

server_feedback.listen(3672, function() {
	log.info('server_feedback listening for connection requests on port 3672 at localhost');
});
//__________________________________________________________________________________________//


/*//==========================================================================================//
                          KNX CONNECTION
//============================================================================================*/
let connection = new KnxConnectionTunneling(knx_ip, 3671, ip.address(), 48965);

connection.on('event', (dest,value) => {
	try{
		var FB_obj = {"topic": dest, "payload": value};
		log.info("Data received from KNX IPS:", JSON.stringify(FB_obj), ". Transmitting it to clients of feedback server.");
				for(var i=0;i<socket_feedback.length;i++){
				socket_feedback[i].write(JSON.stringify(FB_obj));
			}
	} catch (e) {
		log.info("Error", e);
	}
});

connection.on('status', (dest,value) => {
	try {
		var FB_obj = {"topic": dest, "payload": value};
		log.info("Data received from KNX IPS:", JSON.stringify(FB_obj), ". Transmitting it to clients of feedback server.");
		for(var i=0;i<socket_feedback.length;i++){
			socket_feedback[i].write(JSON.stringify(FB_obj));
		}
	} catch (e) {
		log.info("Error", e);
	}
});


connection.Connect(function () {
   console.log('Manager connected to IPS:');
});

function write(addr, value, dpt) {
	switch(dpt){
		case '1.001':
			value = Boolean(value);
			break;
	    case '5.001':
			value = Math.round(value*2.55);
            break;
		case '5.004':
			value = value;
			break;
	}
	connection.Action(addr, value);
}

function read(addr){
	connection.RequestStatus(addr)
}

callback(results);
}
