var Service, Characteristic;
const rest =  require("./rest.js");
var net = require('net');
var current_state = [];
var device_index = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-rako_hub-Dimmer", "Rako_Hub-Dimmer", rako);
}
function rako(log, config)
{
   /* Mandatory Parameters */
   this.serial = config["Serial-No."];
   this.ip = config["IP-Address-of-Rako-Hub"];
   this.plugin_ip = config["IP-Address-of-Manger-Hub"] || 'localhost';
   this.dimmer = config["Dimmer"];

   /* Logs */
   this.log = log;
}

rako.prototype.accessories = function(callback){

	var results = [];
	const ip = this.ip;
	var plugin_ip = this.plugin_ip;

	let client = new net.Socket();
    client.connect(9762,  plugin_ip, function() {
	 console.log('Dimmer Platform Connected to Device Manager');
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
	console.log('Dimmer Platform Disconnected from Device Manager');
    });

    client.on('error', function(err) {  
       console.log('err=',err)
	   setTimeout(() => client.connect({ port: 9762, host: plugin_ip }), 5000);
    });

 
for(var i=0;i<this.dimmer.length;i++){
	       current_state.push(100);
	       var temp_device_locate = this.dimmer[i]["Room"]+this.dimmer[i]["Channel"];
	       device_index.push(temp_device_locate);
		   results.push(new RAKODIMMER(ip, this.dimmer[i]["Room"],  this.dimmer[i]["Channel"],  this.dimmer[i]["Name"], device_index.indexOf(temp_device_locate)));
 }
 callback(results)
}

class RAKODIMMER{
	constructor(ip,room,channel,name, index){
	this.ip = ip;
	this.room = room;
	this.channel = channel;
	this.name =  name;
	this.index = index;
	this.RAKODIMMER = new Service.Lightbulb(this.name);
	}

	seton(stt){
	 var url;
	setTimeout(() => {
     if(stt && current_state[this.index] == 0){
		url = "/rako.cgi?room="+this.room+"&ch="+this.channel+"&lev=255";
	 }
     else if(stt && current_state[this.index] != 0 ){
	     url = "/rako.cgi?room="+this.room+"&ch="+this.channel+"&lev="+String(current_state[this.index]);
     }
     else {
		url = "/rako.cgi?room="+this.room+"&ch="+this.channel+"&lev=0";
	 }
	    rest.set(url,this.ip);
	}, 300);
	}
    geton(){
        return Boolean(current_state[this.index]);	
   	}

	setbrightness(stt){
		current_state[this.index] = Math.round(stt*2.55);
		var url = "/rako.cgi?room="+this.room+"&ch="+this.channel+"&lev="+String(Math.round(stt*2.55));
		rest.set(url,this.ip);
	}
	getbrightness(){
		return Math.round(current_state[this.index]/2.55);	
	}

	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Rako COntrols")
         .setCharacteristic(Characteristic.Model, "RakoDimmer")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.RAKODIMMER
         .getCharacteristic(Characteristic.On).onGet(this.geton.bind(this)).onSet(this.seton.bind(this)); 
	  this.RAKODIMMER
         .getCharacteristic(Characteristic.Brightness).onGet(this.getbrightness.bind(this)).onSet(this.setbrightness.bind(this)); 	 
	 return [infoService,this.RAKODIMMER];
    }
	
	update_state(cs){
		this.RAKODIMMER.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
		this.RAKODIMMER.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(cs/2.55));
    }
}
