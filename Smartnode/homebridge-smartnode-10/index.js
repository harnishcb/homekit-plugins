var Service, Characteristic;
var net = require('net');
var set = require('./setvalue.js');
var current_value = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var current_state = [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false];
var map = ["0","A"];
var updated_token = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-smartnode-10", "Smartnode-Device-10_Channel", sn);
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
 var update_id = [];
 const gen = updated_token.length-1;
 const ip = this.ip;
 const serial = this.serial;

 let client = new net.Socket();
 client.connect(13002, this.ip, function() {
	console.log('Connected to SN-10 at IP='+ip);
	auto_fetch_status();
	setTimeout(() => auto_fetch_status(), 10000);
    setInterval(() => auto_fetch_status(), 60000);
  });
 client.on('data', function(data) {
	try {
	data = JSON.parse(data);
    console.log(JSON.stringify(data));
	if(data.cmd == "STS" && data.dimmer != undefined){
	console.log('Received from device: '+'cmd_type='+data.cmd+', val='+data.val+' Dimmer='+data.dimmer+' ip='+ip);			
		for(var i=0;i<data.val.length;i++){
	      var temp_1 = Boolean(map.indexOf(data.val[i]));
          results[update_id[i]].updatevalue(temp_1,data.dimmer[i],i%2);
		  current_state[(gen*10)+i] = temp_1;
		  current_value[(gen*10)+i] = data.dimmer[i];
		}
	}
	if(data.cmd == "SET"){
	    console.log('Received from device: Node='+data.node+'  cmd_type=SET, cmd_source='+data.by+' val='+data.val+' Dimmer='+data.dimmer);					
		var temp_1 = Boolean(map.indexOf(data.val));
        results[data.node - 1].updatevalue(temp_1,data.dimmer);
		current_state[(gen*10)+data.node-1] = temp_1;
	    current_value[(gen*10)+data.node-1] = data.dimmer;
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
	console.log('err='+ip);
 });


 function auto_fetch_status(){
	var status_command = '{"cmd":"STS", "slave":"'+serial+'", "token":"'+updated_token[gen]+'"}';
	client.write(status_command);
 }

var type_locate = [this.conf[0].Channel_1,this.conf[0].Channel_2,this.conf[0].Channel_3,this.conf[0].Channel_4,this.conf[0].Channel_5,this.conf[0].Channel_6,this.conf[0].Channel_7,this.conf[0].Channel_8, this.conf[0].Channel_9, this.conf[0].Channel_10];

var temp_index_pushupdate = 0;
 for(var i=0;i<10;){
	switch(type_locate[i]){
	  case "Fan":
		 results.push(new SNFAN(this.serial,i+1,gen,ip,this.name));
		 current_value.push(0);
		 update_id.push(temp_index_pushupdate);
		 temp_index_pushupdate++;
		 i++;
		 break;
	   case "Dimmer":
		 results.push(new SNDIMMER(this.serial,i+1,gen,ip,this.name));
		 current_value.push(0);
		 update_id.push(temp_index_pushupdate);
		 temp_index_pushupdate++;
		 i++;
		 break;
	   case "Switch":
		 results.push(new SNSWITCH(this.serial,i+1,gen,ip,this.name));
		 current_value.push(0);
		 update_id.push(temp_index_pushupdate);
		 temp_index_pushupdate++;;
		 i++;
		 break;
	   case "TunableY":
			results.push(new SNCCT(this.serial,i+1,gen,ip,this.name));
			current_value.push(0);
			update_id.push(temp_index_pushupdate, temp_index_pushupdate);
			temp_index_pushupdate++;
			i=i+2;
			break;
			case "Lock":
				results.push(new SNLOCK(this.serial,i+1,gen,ip,this.name));
				current_value.push(0);
				update_id.push(temp_index_pushupdate);
				temp_index_pushupdate++;;
				i++;
				break;
	}
 }
 callback(results)
}

class SNSWITCH{
	constructor(serial, node, gen,ip,name){
    this.serial = serial;
	this.node = node;
	this.gen = gen;
	this.ip = ip;
    this.index = ((this.gen*10) + Number(this.node)-1);
	this.name =  name+'-'+node;
	this.SNSWITCH = new Service.Switch(this.name);
	}
	setsnswt(stt){
      set.set_data("S"+String(this.node-1)+map[Number(stt)] , this.ip, this.gen, this.serial, updated_token[this.gen]);
    }
	getsnswt(){
	  return current_state[this.index];
	}
	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN10-Switch")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.SNSWITCH
         .getCharacteristic(Characteristic.On).onGet(this.getsnswt.bind(this)).onSet(this.setsnswt.bind(this)); 
	 return [infoService,this.SNSWITCH];
    }
	updatevalue(cs,cv){
		this.SNSWITCH.getCharacteristic(Characteristic.On).updateValue(cs);
	}
}


class SNDIMMER{
	constructor(serial, node, gen,ip,name){
		this.serial = serial;
		this.node = node;
		this.gen = gen;
		this.ip = ip;
		this.index = ((this.gen*10) + Number(this.node)-1);
		this.name =  name+'-'+node;
        this.SNDIMMER = new Service.Lightbulb(this.name);
}
   setsnbulb(stt){
      set.set_data("S"+String(this.node-1)+map[Number(stt)], this.ip, this.gen, this.serial, updated_token[this.gen]); 
    }
     setsnval(stt){
      set.set_data("D"+String(this.node-1)+String(stt), this.ip, this.gen, this.serial, updated_token[this.gen]); 
	}
	getsnbulb(){
	  return current_state[this.index];
	}
	getsnval(){
	  return current_value[this.index];
	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN10-Dimmer")
         .setCharacteristic(Characteristic.SerialNumber,this.serial);
      this.SNDIMMER
         .getCharacteristic(Characteristic.On).onGet(this.getsnbulb.bind(this)).onSet(this.setsnbulb.bind(this));
     this.SNDIMMER
        .getCharacteristic(Characteristic.Brightness).onGet(this.getsnval.bind(this)).onSet(this.setsnval.bind(this));
	 return [infoService,this.SNDIMMER];
    }	
		updatevalue(cs,cv){
           this.SNDIMMER.getCharacteristic(Characteristic.On).updateValue(cs);
	       this.SNDIMMER.getCharacteristic(Characteristic.Brightness).updateValue(cv);
    }
}

class SNFAN{
	constructor(serial, node, gen,ip,name){
		this.serial = serial;
		this.node = node;
		this.gen = gen;
		this.ip = ip;
		this.index = ((this.gen*10) + Number(this.node)-1);
		this.name =  "SN10-"+name+'-'+node;
        this.SNFAN = new Service.Fan(this.name);
	}
	 setsnfan(stt){
     set.set_data("S"+String(this.node-1)+map[Number(stt)], this.ip, this.gen, this.serial, updated_token[this.gen]); 
    }
     setsnfanval(stt){
     set.set_data("D"+String(this.node-1)+String(stt), this.ip, this.gen, this.serial, updated_token[this.gen]); 
	}
	getsnfan(){
	   return current_state[this.index];
	}
	getsnfanval(){
	   return current_value[this.index];
	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN10-Fan")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
     this.SNFAN
         .getCharacteristic(Characteristic.On).onGet(this.getsnfan.bind(this)).onSet(this.setsnfan.bind(this));
     this.SNFAN
     .getCharacteristic(Characteristic.RotationSpeed).onGet(this.getsnfanval.bind(this)).onSet(this.setsnfanval.bind(this))
	 .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: 20
         });
	 return [infoService,this.SNFAN];
    }
	updatevalue(cs,cv){
	  this.SNFAN.getCharacteristic(Characteristic.On).updateValue(cs);
	  this.SNFAN.getCharacteristic(Characteristic.RotationSpeed).updateValue(cv);
    }
}



class SNCCT{
	constructor(serial, node, gen,ip,name){
		this.serial = serial;
		this.node = node;
		this.gen = gen;
		this.ip = ip;
		this.index = ((this.gen*10) + Number(this.node)-1);
		this.name = name+'-'+node;
        this.SNCCT = new Service.Lightbulb(this.name);
    }
    setsnbulb(stt){
	  set.set_data("S"+String(this.node-1)+map[Number(stt)], this.ip, this.gen, this.serial, updated_token[this.gen]); 	   
    }
    setsnval(stt){
		set_ct.set_data(JSON.stringify({"slave": this.serial,  "token": updated_token[this.gen], "cmd": "CUS", "sub_cmd":"TUN", "operation": 10, "data": [[ (this.node-1)/2, 1, current_value[this.index+1], stt]] }) , this.ip);
	}
  	setsnct(stt){
		stt = Math.round(((1000000/stt) - 2000)/50);
        console.log("Set Temp",stt);
		set_ct.set_data(JSON.stringify({"slave": this.serial,  "token": updated_token[this.gen], "cmd": "CUS", "sub_cmd":"TUN", "operation": 10, "data": [[(this.node-1)/2, 1, stt, current_value[this.index]]] }) , this.ip);
	}
	getsnbulb(){
	  return current_state[this.index];
	}
	getsnval(){
	  return current_value[this.index];
	}
	getsnct(){
		return 	Math.round(1000000/(2000+(current_value[this.index+1]*50)));
	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN-10")
         .setCharacteristic(Characteristic.SerialNumber,this.serial);
      this.SNCCT
        .getCharacteristic(Characteristic.On).onGet(this.getsnbulb.bind(this)).onSet(this.setsnbulb.bind(this));
      this.SNCCT
        .getCharacteristic(Characteristic.Brightness).onGet(this.getsnval.bind(this)).onSet(this.setsnval.bind(this));
	  this.SNCCT
        .getCharacteristic(Characteristic.ColorTemperature).onGet(this.getsnct.bind(this)).onSet(this.setsnct.bind(this))
	    .setProps({
			minValue: 143,
			maxValue: 500,
			minStep: 1
		   });
	 return [infoService,this.SNCCT];
    }
		updatevalue(cs,cv,i){
           this.SNCCT.getCharacteristic(Characteristic.On).updateValue(cs);
		   if(i == 0){
	       this.SNCCT.getCharacteristic(Characteristic.Brightness).updateValue(cv);
		   }
		   else {
           this.SNCCT.getCharacteristic(Characteristic.ColorTemperature).updateValue(Math.round(1000000/(2000+(cv*50))));
		   }
		}
}


class SNLOCK{
	constructor(serial, node, gen,ip,name){
    this.serial = serial;
	this.node = node;
	this.gen = gen;
	this.ip = ip;
    this.index = ((this.gen*10) + Number(this.node)-1);
	this.name =  name+'-'+node;
	this.SNLOCK = new Service.LockMechanism(this.name);
	}
	setsnswt(stt){
      set.set_data("S"+String(this.node-1)+map[1-Number(stt)] , this.ip, this.gen, this.serial, updated_token[this.gen]);
    }
	getsnswt(){
	  return 1-current_state[this.index];
	}
	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN10-Switch")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.SNLOCK
         .getCharacteristic(Characteristic.LockTargetState).onGet(this.getsnswt.bind(this)).onSet(this.setsnswt.bind(this)); 
	  this.SNLOCK
         .getCharacteristic(Characteristic.LockCurrentState).onGet(this.getsnswt.bind(this));
		 return [infoService,this.SNLOCK];
    }
	updatevalue(cs,cv){
		this.SNLOCK.getCharacteristic(Characteristic.LockTargetState).updateValue(1-cs);
		this.SNLOCK.getCharacteristic(Characteristic.LockCurrentState).updateValue(1-cs);
		}
}