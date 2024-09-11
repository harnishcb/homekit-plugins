var Service, Characteristic;
const rest =  require("./rest.js");
var net = require('net');
var current_state = [];
var device_index = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-rako_hub-Curtain", "Rako_Hub-Curtain", rako);
}
function rako(log, config)
{
   /* Mandatory Parameters */
   this.serial = config["Serial-No."];
   this.ip = config["IP-Address-of-Rako-Hub"];
   this.plugin_ip = config["IP-Address-of-Manger-Hub"] || 'localhost';
   this.curtain = config["Curtain"];

   /* Logs */
   this.log = log;
}

rako.prototype.accessories = function(callback){

	var results = [];
	const ip = this.ip;
	var plugin_ip = this.plugin_ip;

	let client = new net.Socket();
    client.connect(9762,  plugin_ip, function() {
	 console.log('Curtain Platform Connected to Device Manager');
    });

    client.on('data', function(data) {
    try {
		data = JSON.parse(data);
		data = data.payload;
		var find_device = device_index.indexOf(String(data.roomId)+String(data.channelId));
		if(find_device != -1){
			results[find_device].update_state(data.targetLevel);
			current_state[find_device] = data.targetLevel;
		}
	}
	catch(err){
    console.log(err);
	}
    });

    client.on('close', function() {
	console.log('Curtain Platform Disconnected from Device Manager');
    });

    client.on('error', function(err) {
       console.log('err=',err)
	   setTimeout(() => client.connect({ port: 9762, host: plugin_ip }), 5000);
    });

for(var i=0;i<this.curtain.length;i++){
	       current_state.push(100);
	       var temp_device_locate = this.curtain[i]["Room"]+this.curtain[i]["Channel"];
	       device_index.push(temp_device_locate);
		   results.push(new RAKOCURTAIN(ip, this.curtain[i]["Room"],  this.curtain[i]["Channel"],  this.curtain[i]["Name"], device_index.indexOf(temp_device_locate)));
 }
 callback(results)
}

class RAKOCURTAIN{
	constructor(ip,room,channel,name, index){
	this.ip = ip;
	this.room = room;
	this.channel = channel;
	this.name =  name;
	this.index = index;
	this.RAKOCURTAIN = new Service.WindowCovering(this.name);
	}

	settargetstate(stt){
	    var url;
		url = "/rako.cgi?room="+this.room+"&ch="+this.channel+"&lev="+String(Math.round(stt*2.55));
	    rest.set(url,this.ip);
	}
    getcurrentposition(){
        return Math.round(current_state[this.index]/2.55);
   	}
	getpositionstate(){
		return 2;
	}

	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Rako Controls")
         .setCharacteristic(Characteristic.Model, "RakoCurtain")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.RAKOCURTAIN
         .getCharacteristic(Characteristic.TargetPosition).onSet(this.settargetstate.bind(this)).onGet(this.getcurrentposition.bind(this));
	  this.RAKOCURTAIN
         .getCharacteristic(Characteristic.CurrentPosition).onGet(this.getcurrentposition.bind(this));
	  this.RAKOCURTAIN
         .getCharacteristic(Characteristic.PositionState).onGet(this.getpositionstate.bind(this));
	 return [infoService,this.RAKOCURTAIN];
    }

	update_state(cs){
		this.RAKOCURTAIN.getCharacteristic(Characteristic.TargetPosition).updateValue(Math.round(cs/2.55));
		this.RAKOCURTAIN.getCharacteristic(Characteristic.CurrentPosition).updateValue(Math.round(cs/2.55));
    }
}