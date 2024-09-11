var Service, Characteristic;
var net = require('net');
var socket_feedback = [];
var KNX = require('./node_modules/knx');
var convert = require('./conversion.js')
module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-knx-Manager", "KNX-IP_Router/Interface", knx);
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
			    connection.write(data.destination, data.value, data.dpt);
			}
			else if(data.event == "GroupValue_Read"){
			  log.info("GroupValue_Read request to KNX for Group address:", data.destination);
			  connection.read(data.destination)
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

var connection = new KNX.Connection( {
	ipAddr: knx_ip, ipPort: 3671,
//	interface: 'eth0',
	physAddr: '1.1.254',
	loglevel: 'info',
	manualConnect: true,
	forceTunneling: false,
	minimumDelay: 70,
	suppress_ack_ldatareq: false,
	localEchoInTunneling:false,
	handlers: {
	  connected: function() {
		log.info('Connected to KNX IPR/S at IP:',knx_ip);
	  },
	  event : function(evt, src, dest, value) {
		    try{
				let val = JSON.parse(JSON.stringify(value));
				var FB_obj = {"topic": dest, "payload": convert.data_process(val.data)};
				log.info("Data received from KNX IPR/S:", JSON.stringify(FB_obj), ". Transmitting it to clients of feedback server.");
						for(var i=0;i<socket_feedback.length;i++){
						socket_feedback[i].write(JSON.stringify(FB_obj));
					}
			} catch (e) {
				log.info("Error", e);
			}
	  },
	  error: function(connstatus) {
		log.info("**** ERROR: %j", connstatus);
	  }
	}
  });

/*connection.on('GroupValue_Write', function (src, dest, value) {
	console.log(src, dest, value);
	console.log("GroupValue Write from", "Physical Address:",src,"for Group Address:",dest,"with Value:",value.toString()) 
	var FB_obj = {"topic": dest, "payload": convert.data_process(value)};
	for(var i=0;i<socket_feedback.length;i++){
          socket_feedback[i].write(JSON.stringify(FB_obj));
	}
});
connection.on('GroupValue_Read', function (src, dest) {  console.log("GroupValue Read request from", "Physical Address:",src,"for Group Address:",dest) });
connection.on('GroupValue_Response', function (src, dest, value) {  console.log("GroupValue Response from", "Physical Address:",src,"for Group Address:",dest,"with Value:",value) });
*/
connection.Connect();
callback(results)
}
