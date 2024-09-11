var Service, Characteristic;
var net = require('net');
var set = require('./setvalue.js');
var current_state = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var map = ["0","A"];
var updated_token = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-smartnode-lock", "Smartnode-Lock", sn);
}  
function sn(log, config) 
{
   /* Mandatory Parameters */	
   this.serial = config["Serial-No."];
   this.conf = config["Configuration"];
   this.ip = config["IP-Address"]; 
   this.name= config["Panel-Name"];
 
   /* Optional Parameters */
   this.token = config["Token of Device"]  || "arbitary_token";
 
   /* Logs */
   this.log = log;
}

sn.prototype.accessories = function(callback){
	updated_token.push(this.token);

	var results = [];
	const gen = updated_token.length-1;
	const ip = this.ip;
	const serial = this.serial;
   
	let client = new net.Socket();
    client.connect(13002, this.ip, function() {
	 console.log('Connected to SN-Lock at IP='+ip);
	 client.write('{"cmd":"STS", "slave":"'+serial+'", "token":"'+updated_token[gen]+'"}');
	 setInterval(() => client.write('{"cmd":"STS", "slave":"'+serial+'", "token":"'+updated_token[gen]+'"}'), 60000);
    });

    client.on('data', function(data) {      
	 try {
	 data = JSON.parse(String(data));
        console.log(JSON.stringify(data), ip);
	 if(data.cmd == "STS" && data.dimmer != "undefined"){
	 console.log('Received: '+'cmd_type=STS, val='+data.val+' Dimmer='+data.dimmer+' ip='+ip);
		for(var i=0;i<data.val.length;i++){
          var temp_1 = Number(map.indexOf(data.val[i]));
	      results[i].updatevalue(temp_1,data.dimmer[i]);
		  current_state[(gen*2)+i] = temp_1;
		//  current_value[(gen*2)+i] = data.dimmer[i];		
      }
	}
	if(data.cmd == "SET"){
	    console.log('Received: Node='+data.node+'  cmd_type=SET, cmd_source='+data.by+' val='+data.val+' Dimmer='+data.dimmer+' ip='+ip);					
		  var temp_1 = Number(map.indexOf(String(data.val)));
          results[data.node - 1].updatevalue(temp_1,Number(data.dimmer));	              	
		  current_state[(gen*2)+data.node-1] = temp_1;
	    //  current_value[(gen*2)+data.node-1] = Number(data.dimmer);
	}
	if(data.status == "token_invalid"){
		  updated_token[gen] = data.A_tok;
	}
	}catch(err){
	//	console.log(err);
	}
 });

client.on('close', function() {
	console.log('Device Offline=',ip);
    setTimeout(() => client.connect({ port: 13002, host: ip }), 5000);
 });

client.on('error', function(err) {  
       console.log('err=',ip)
});
	
results.push(new SNLOCK(this.serial,1,gen,ip,this.name));
results.push(new SNLOCK(this.serial,2,gen,ip,this.name));
//current_value.push(0); 

 callback(results)
}
    
class SNLOCK{
	constructor(serial, node,gen,ip,name){
	this.serial = serial;
	this.node = node;	
	this.gen = gen;
	this.ip = ip;  
	this.index = ((gen*2) + node-1);
	this.name =  "SN-Lock-"+name+'-'+node;
	this.SNLOCK = new Service.LockMechanism(this.name);
	}
	setsnswt(stt){
    	set.set_data("S"+String(this.node-1)+map[stt] , this.ip, this.gen, this.serial, updated_token[this.gen]);	   
    }
    getsnswt(){
         return 1-current_state[this.index];
   	}	
	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN-Lock")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.SNLOCK
         .getCharacteristic(Characteristic.LockCurrentState).onGet(this.getsnswt.bind(this));
	  this.SNLOCK
         .getCharacteristic(Characteristic.LockTargetState).onGet(this.getsnswt.bind(this)).onSet(this.setsnswt.bind(this));
	  
	 return [infoService,this.SNLOCK];
    }
	updatevalue(cs,cv){
		this.SNLOCK.getCharacteristic(Characteristic.LockTargetState).updateValue(1-cs);
		this.SNLOCK.getCharacteristic(Characteristic.LockCurrentState).updateValue(1-cs);
		
	     }
}
