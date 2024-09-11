var Service, Characteristic;
var net = require('net');
var current_value = [];
var dimmer_map = ["0","1","2","3","4","5","6","7","8","b","c","d","e","f","g","h"];
var fan_map = ["0","1","3","4","6","7","8"];
var execute = [];
var gen_index = [];
module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-zemote-panel_10", "Zemote_Panel-10", zm);
}  
function zm(log, config) 
{
  this.log = log;
  this.token = config["Token-No."];
  this.conf = config["Configuration"];
  this.ip = config["IP-Address"]; 
  this.name = config["Panel-Name"];
}

zm.prototype.accessories = function(callback){
var sent = require('./setvalue.js');
var curtain_sent = 	require('./setcurtain.js');
 var results = [];
 gen_index.push("update");
 var ip = this.ip;
 var token = this.token;
 var gen = gen_index.length-1;
 function getupdate(){
 let client = new net.Socket();
 client.connect(50505, ip, function() {
	client.write(token+"#%aaaa");
 });
 client.on('data', function(data) {
 data = data.toString();
 var len = data.lastIndexOf('.')-10;
 console.log(len);
 for(var i=0;i<10;i++){
	 if(execute[i]){
	 results[i].updatevalue(data[len+i]);
	 current_value[i] = data[len+i];
	 }}
 client.destroy();
 });
 client.on('close', function() {
	 client.destroy();
 }); 
 client.on('error', function(err) {
	 client.destroy();
 });
}
setInterval(() => { getupdate() }, 1500);

var type_locate = [this.conf[0].Channel_1,this.conf[1].Channel_2,this.conf[2].Channel_3,this.conf[3].Channel_4,this.conf[4].Channel_5,this.conf[5].Channel_6,this.conf[6].Channel_7,this.conf[7].Channel_8,this.conf[8].Channel_9,this.conf[9].Channel_10,this.conf[10].Curtain_1];

 for(var i=0;i<11;i++){
	switch(type_locate){
		case "Fan":
			results.push(new ZMFAN(this.token,i,current_value.length,this.ip,sent,gen,this.name));
			current_value.push("0");
			execute.push(true);
			break;
		  case "Dimmer":
			results.push(new ZMDIMMER(this.token,i,current_value.length,this.ip,sent,gen,this.name));
			current_value.push("0");
			execute.push(true);		 
			break;	 
		  case "Switch":
			results.push(new ZMSWITCH(this.token,i,current_value.length,this.ip,sent,gen,this.name));
			current_value.push("0"); 
			execute.push(true);		 
			break;	
		  case "Yes":	
			results.push(new ZMCURTAIN(this.token,i-4,this.ip,curtain_sent,this.name));
			current_value.push("0"); 
			execute.push(true);		 
			break;		
	} 	 
 }
 callback(results)
}
    

class ZMSWITCH{
	constructor(token, node, position,ip,sent,gen,name){
		this.node = node;
		this.token= token;
		this.position = position;
		this.ip = ip;
		this.sent = sent;
		this.gen = gen;
		this.name =  "ZM-"+name+node;
	    this.ZMSWITCH = new Service.Switch(this.name);
	}	
	setswitch(stt){ 
		execute[this.position] = false;
		setTimeout(() =>  { execute[this.node] = true } , 5000);
      this.sent.set(this.token+'#%'+('aaaaaaaaaa').substring(0, this.node) + String(Number(stt)) + ('aaaaaaaaaa').substring(this.node+1) , this.ip, this.gen);
    }	
	getswitch(){   	
         return Boolean(parseInt(current_value[this.node]));	
	}
	 getServices(){
       var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Zemote Automations")
         .setCharacteristic(Characteristic.Model, "LFM-8")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
        this.ZMSWITCH
         .getCharacteristic(Characteristic.On).onGet(this.getswitch.bind(this)).onSet(this.setswitch.bind(this)); 
	 return [infoService,this.ZMSWITCH];
    }
	updatevalue(cs){
		this.ZMSWITCH.getCharacteristic(Characteristic.On).updateValue(Boolean(Number(cs)));
	}
}



class ZMDIMMER{
	constructor(token, node, position,ip,sent,gen,name){
		this.node = node;
		this.token= token;
		this.position = position;
		this.ip = ip;
		this.sent = sent;
		this.gen = gen;
		this.name =  "ZMDimmer-"+name+node;
    this.ZMDIMMER = new Service.Lightbulb(this.name);
	}	
	 setswitch(stt){
		execute[this.position] = false;
		setTimeout(() =>  { execute[this.position] = true } , 5000);	 
	  if(stt == false){
      this.sent.set(this.token+'#%'+('aaaaaaaaaa').substring(0, this.node) + '0' + ('aaaaaaaaaa').substring(this.node + 1) , this.ip,this.gen);		  
	  }
	  else{
      setTimeout(() => this.sent.set(this.token+'#%'+('aaaaaaaaaa').substring(0, this.node) + current_value[this.node] + ('aaaaaaaaaa').substring(this.node+1) , this.ip, this.gen),500);
	  }
      }
     setvalue(stt){
        current_value[this.node] = dimmer_map[Math.round(stt*20/3)];
	    setTimeout(() => this.sent.set(this.token+'#%'+('aaaaaaaaaa').substring(0, this.node) + current_value[this.node] + ('aaaaaaaaaa').substring(this.node+1) , this.ip, this.gen),500);

	} 	 
	getswitch(){
           return Boolean(dimmer_map.indexOf(current_value[this.node]));	
	}	
	getvalue(){
           return Math.round(dimmer_map.indexOf(current_value[this.node]) * (20/3));	
	}
	
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Zemote Automations")
         .setCharacteristic(Characteristic.Model, "ZM-10")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
     this.ZMDIMMER
         .getCharacteristic(Characteristic.On).onGet(this.getswitch.bind(this)).onSet(this.setswitch.bind(this));
     this.ZMDIMMER
        .getCharacteristic(Characteristic.Brightness).onGet(this.getvalue.bind(this)).onSet(this.setvalue.bind(this))
	    .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: 1
         });    		 
	 return [infoService,this.ZMDIMMER];
    }
	updatevalue(cs){
	  var dimmer_update_value = dimmer_map.indexOf(cs);
	  this.ZMDIMMER.getCharacteristic(Characteristic.On).updateValue(Boolean(temp_update_value));
	  this.ZMDIMMER.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(temp_update_value*(20/3)));
    }
}



class ZMFAN{
	constructor(token, node, position,ip,sent,gen,name){
		this.node = node;
		this.token= token;
		this.position = position;
		this.ip = ip;
		this.sent = sent;
		this.gen = gen;
		this.name =  "ZM Fan-"+name+node;
    this.ZMFAN = new Service.Fan(this.name);
	}	
	setswitch(stt){
      execute[this.position] = false;
	  setTimeout(() =>  { execute[this.node] = true } , 5000); 	 
	  if(stt == false){
      this.sent.set(this.token+'#%'+('aaaaaaaaaa').substring(0, this.node) + '0' + ('aaaaaaaaaa').substring(this.node + 1) , this.ip,this.gen);		  
	  }
	  else{
      setTimeout(() => this.sent.set(this.token+'#%'+('aaaaaaaaaa').substring(0, this.node) + current_value[this.node] + ('aaaaaaaaaa').substring(this.node + 1),this.ip, this.gen),500);
	  }
      }
    setvalue(stt){
       current_value[this.node] = fan_map[stt/20];
	   setTimeout(() => this.sent.set(this.token+'#%'+('aaaaaaaaaa').substring(0, this.node) + current_value[this.node] + ('aaaaaaaaaa').substring(this.node + 1) , this.ip, this.gen),500);
	 } 	 
	getswitch(){
           return Boolean(fan_map.indexOf(current_value[this.node]));	
	}	
	getvalue(){
           return fan_map.indexOf(current_value[this.node])*20;	
	}
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Zemote Automations")
         .setCharacteristic(Characteristic.Model, "ZM-10")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
     this.ZMFAN
         .getCharacteristic(Characteristic.On).onGet(this.getswitch.bind(this)).onSet(this.setswitch.bind(this));
     this.ZMFAN
        .getCharacteristic(Characteristic.RotationSpeed).onGet(this.getvalue.bind(this)).onSet(this.setvalue.bind(this))
	    .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: 20
         });    		 
	 return [infoService,this.ZMFAN];
    }
	updatevalue(cs){
	  var fan_update_value = fan_map.indexOf(cs);		
	  this.ZMFAN.getCharacteristic(Characteristic.On).updateValue(Boolean(fan_update_value));
	  this.ZMFAN.getCharacteristic(Characteristic.RotationSpeed).updateValue(fan_update_value*20);
    }
}



class ZMCURTAIN{
	constructor(token,node,ip,sent,name){
	  this.node = node;
	  this.token= token;
	  this.ip = ip;
	  this.sent = sent
	  this.name =  "ZMCurtain-"+name+node;
	  this.ZMCURTAIN = new Service.WindowCovering(this.name);
	  }	
	   settp(stt){
		this.sent.set(this.token+'#%aaaaaaaaaaX'+ this.node + String(2-(stt/100)) + '600' , this.ip);		  
		setTimeout(() => this.ZMCURTAIN.getCharacteristic(Characteristic.CurrentPosition).updateValue(stt), 2000);
		 }
	   getps(){
		return 2;
	    } 	 	
	   getcp(){
			 return 100;	
	  }	
	 getServices(){
		var infoService = new Service.AccessoryInformation();
		  infoService
		   .setCharacteristic(Characteristic.Manufacturer, "Zemote Automations")
		   .setCharacteristic(Characteristic.Model, "ZM-8")
		   .setCharacteristic(Characteristic.SerialNumber, this.serial);
	   this.ZMCURTAIN
		   .getCharacteristic(Characteristic.TargetPosition).onSet(this.settp.bind(this))
		   .setProps({
			minValue: 0,
			maxValue: 100,
			minStep: 100
		  });
	   this.ZMCURTAIN
		  .getCharacteristic(Characteristic.CurrentPosition).onGet(this.getcp.bind(this))
		  .setProps({
			minValue: 0,
			maxValue: 100,
			minStep: 100
		  });
	   this.ZMCURTAIN
		  .getCharacteristic(Characteristic.PositionState).onGet(this.getps.bind(this))   
		  .setProps({
			minValue: 2,
			maxValue: 2,
			minStep: 1
		  });	 		 
	   return [infoService,this.ZMCURTAIN];
	  }
  
}  