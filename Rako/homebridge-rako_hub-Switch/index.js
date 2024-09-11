var Service, Characteristic;
const rest =  require("./rest.js");
var net = require('net');
var current_state = [];
var device_index = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-rako_hub-Switch", "Rako_Hub-Switch", rako);
}  
function rako(log, config) 
{
   /* Mandatory Parameters */	
   this.serial = config["Serial-No."];
   this.ip = config["IP-Address-of-Rako-Hub"]; 
   this.plugin_ip = config["IP-Address-of-Manger-Hub"] || 'localhost';
   this.switch = config["Switch"];

   /* Logs */
   this.log = log;
}

rako.prototype.accessories = function(callback){

	var results = [];
	const ip = this.ip;
    var plugin_ip = this.plugin_ip;
	let client = new net.Socket();
    client.connect(9762,  plugin_ip, function() {
	 console.log('Switch Platform Connected to Device Manager');
	 setTimeout(() => JSON.stringify({}), 10000);
    });

    client.on('data', function(data) {
    try {
		data = JSON.parse(data);
		data = data.payload;
		var find_device = device_index.indexOf(String(data.roomId)+String(data.channelId));
		if(find_device != -1){
			results[find_device].update_state(Boolean(data.targetLevel));
			current_state[find_device] = Boolean(data.targetLevel);
		}
	}
	catch(err){
    console.log(err);
	} 
    });

    client.on('close', function() {
	console.log('Switch Platform Disconnected from Device Manager');
    });

    client.on('error', function(err) {  
       console.log('err=',err)
	   setTimeout(() => client.connect({ port: 9762, host: plugin_ip }), 5000);
    });

 
for(var i=0;i<this.switch.length;i++){
	       current_state.push(false);
	       var temp_device_locate = this.switch[i]["Room"]+this.switch[i]["Channel"];
	       device_index.push(temp_device_locate);
		   results.push(new RAKOSWITCH(ip, this.switch[i]["Room"],  this.switch[i]["Channel"],  this.switch[i]["Name"], device_index.indexOf(temp_device_locate)));
 }
 callback(results)
}
    
class RAKOSWITCH{
	constructor(ip,room,channel,name,index){
	this.ip = ip; 	
	this.room = room;
	this.channel = channel;	
	this.name =  name;
	this.index = index;
	this.RAKOSWITCH = new Service.Switch(this.name);
	}	

	seton(stt){        
	 var url;	
     if(stt){
		url = "/rako.cgi?room="+this.room+"&ch="+this.channel+"&lev=255";
	 } 
	 else {
		url = "/rako.cgi?room="+this.room+"&ch="+this.channel+"&lev=0";
	 }
	 rest.set(url,this.ip);
	}	

    geton(){    		
         return current_state[this.index];	
   	}	
	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Rako COntrols")
         .setCharacteristic(Characteristic.Model, "Rakoswitch")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.RAKOSWITCH
         .getCharacteristic(Characteristic.On).onGet(this.geton.bind(this)).onSet(this.seton.bind(this)); 
	 return [infoService,this.RAKOSWITCH];
    }
	
	update_state(cs){
		this.RAKOSWITCH.getCharacteristic(Characteristic.On).updateValue(cs);
    }
}