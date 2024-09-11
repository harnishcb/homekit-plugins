var Service, Characteristic;

//******* Requirements ***************//
var dgram = require("dgram");
var trigger = require("./rest.js");

//**     Array to map each channel properties of Panel with Homekit accessories   **///
var track =[];

//**     Array to save current feedback of Panel    **///
var current_value = [];

//**         function exports the platform to homebridge ***//
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-toyama", "Toyama-Zigbee_Tgate", toyama);
}
function toyama(log, config) 
{
//**         fetch required parameters from config.json  ***//		
  this.log = log;
  this.ip = config["IP-Address-of-TGate"];
  this.panel = config["panel"];
}
toyama.prototype.accessories = function(callback){
var results = [];	
//-----------Initialise UDP feedback socket------------------------------------------//
var server = dgram.createSocket("udp4");
server.on("error", function (err) {
  console.log("server error:n" + err.stack);
  server.close();
});
server.on("message", function (msg, rinfo) {
	
//***** Decode the data send by Toyama server and update it to respective accessories class sub function ***//		
  console.log("Message:-" + msg +"ip:"+rinfo.address);
  msg = msg.toString();
   if(msg.indexOf("#$") !== -1){
     msg = msg.split("\n");
     for(var i=0;i<msg.length;i++){
     if(msg[i].indexOf("#$") != -1){
     var temp_i = msg[i].replace("#$" , "");
     temp_i = temp_i.replace("$#","");
     var temp_mac = temp_i.slice(0,5);
     var temp_array = temp_i.slice(6,temp_i.length-1);
     temp_array = temp_array.split(",");
     console.log(temp_mac,temp_array);
      for(var t=0;t<temp_array.length;t++){
      var temp_1 = track.indexOf(temp_mac+String(11+t));
       if(temp_1 !== -1) {
             console.log(temp_1);
             results[temp_1].updatevalue(Number(temp_array[t]));
             current_value[temp_1] = Number(temp_array[t]);
        }
    }}
   }}
   else {
  msg = msg.slice(msg.indexOf('\n'),);
  msg = msg.split(" ");
  
 if(msg[7] == "f7"){
  var temp_1 = track.indexOf(msg[3].toUpperCase()+' '+msg[4].toUpperCase()+msg[9]);
  console.log(temp_1, msg[3].toUpperCase()+' '+msg[4].toUpperCase()+msg[9], track);
  if(temp_1 !== -1){
    console.log('value update ',temp_1, parseInt(msg[12],16))
  results[temp_1].updatevalue(parseInt(msg[12],16));
  current_value[temp_1] = parseInt(msg[12],16);
  }}
 else if(msg[7] == "01"){
   var last_temp = msg.lastIndexOf("aa")-9;
    console.log(last_temp);
    for(var t=0;t<last_temp;t++){
      var temp_1 = track.indexOf(msg[3].toUpperCase()+' '+msg[4].toUpperCase()+String(11+t));
       if(temp_1 !== -1) {
             console.log(temp_1);
             results[temp_1].updatevalue(Number(msg[8+t]));
              current_value[temp_1] = Number(msg[8+t]);
        }
}
 }
}
});
server.on("listening", function () {
  var address = server.address();
  console.log("Apple Home Server listening" + address.address + ":" + address.port);
  setTimeout(() => { trigger.getfeedback() } , 5000);
});
server.bind(56000);

//*********   lauch the accessories after mapped with configuration metioned with config.json ***//	
	var map_device = [TYSWITCH, TYDIMMER, TYFAN, TYCURTAIN];
	for(var i=0;i<this.panel.length;i++){
	  for(var j=0;j<this.panel[i].config.length;j++){			 	  
	     results.push(new map_device[this.panel[i].config[j]](this.panel[i].MAC, this.panel[i].id[j], track.length));
		   track.push(this.panel[i].macid+(parseInt(this.panel[i].id[j])+10));
       current_value.push(0);
	  }
	}
	callback(results);
}
	
class TYSWITCH{
	constructor(macid,id,index){
    this.macid = macid;
	  this.id = 16+id;
	  this.index = index;
	  this.name = "TY Swt-"+this.index;	 	  
	  this.TYSWITCH = new Service.Switch(this.index);	  
	}
	//**       Trigger and feedback function related to each property of the Accessries // 		
	setswitch(stt){ 
      trigger.set(this.macid, this.id, Number(stt));
    }	
	getswitch(){   	
         return Boolean((current_value[this.index]));	
	}
	 getServices(){
	      /// Define the infoservice of the homekit accesies //	 
       var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Toyama world")
         .setCharacteristic(Characteristic.Model, "Toyama Panel Switch")
         .setCharacteristic(Characteristic.SerialNumber, "TYSWT-"+this.macid + this.id);
		 /// Define the Activity Service  of the homekit accessories //	 	 
        this.TYSWITCH
         .getCharacteristic(Characteristic.On).onGet(this.getswitch.bind(this)).onSet(this.setswitch.bind(this)); 
	 return [infoService,this.TYSWITCH];
    }
	updatevalue(cs){
                console.log(this.id, cs);
		this.TYSWITCH.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
	}
}





class TYDIMMER{
	constructor(macid,id,index){
      this.macid = macid;
	  this.id = 16+id;
	  this.index = index;
	  this.name = "TY Dim-"+this.index;	 	  
	  this.TYDIMMER = new Service.Lightbulb(this.index);	  
	}
	setswitch(stt){ 
        if(stt && current_value[this.index] == 0){
           trigger.set(this.macid, this.id, 100);
          }
       else if(!stt){
          trigger.set(this.macid, this.id, 0);
         }
    }	
	getswitch(){   	
         return Boolean((current_value[this.index]));	
	}
	setdimmer(stt){ 
      trigger.set(this.macid, this.id, stt);
    }	
	getdimmer(){   	
         return current_value[this.index];	
	}
	 getServices(){
		      /// Define the infoservice of the homekit accesies //	 
	 
       var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Toyama world")
         .setCharacteristic(Characteristic.Model, "Toyama Panel Switch")
         .setCharacteristic(Characteristic.SerialNumber, "TYSWT-"+this.macid + this.id);
		 		 /// Define the Activity Service  of the homekit accessories //	 	 
        this.TYDIMMER
         .getCharacteristic(Characteristic.On).onGet(this.getswitch.bind(this)).onSet(this.setswitch.bind(this)); 
		this.TYDIMMER
         .getCharacteristic(Characteristic.Brightness).onGet(this.getdimmer.bind(this)).onSet(this.setdimmer.bind(this));  
	 return [infoService,this.TYDIMMER];
    }
	updatevalue(cs){
        console.log(this.id, cs);
		this.TYDIMMER.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
		this.TYDIMMER.getCharacteristic(Characteristic.Brightness).updateValue(cs);
		
	}
}





class TYFAN{
	constructor(macid,id,index){
      this.macid = macid;
	  this.id = 16+id;
	  this.index = index;
	  this.name = "TY Fan-"+this.index;	 	  
	  this.TYFAN = new Service.Fan(this.index);	  
	}
	setswitch(stt){ 
        if(stt && current_value[this.index] == 0){
           trigger.set(this.macid, this.id, 100);
          }
       else if(!stt){
          trigger.set(this.macid, this.id, 0);
         }
    }	
	getswitch(){   	
         return Boolean((current_value[this.index]));	
	}
	setdimmer(stt){ 
      trigger.set(this.macid, this.id, stt);
    }	
	getdimmer(){   	
         return current_value[this.index];	
	}
	 getServices(){
		      /// Define the infoservice of the homekit accesies //	 
	 
       var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Toyama world")
         .setCharacteristic(Characteristic.Model, "Toyama Panel Switch")
         .setCharacteristic(Characteristic.SerialNumber, "TYSWT-"+this.macid + this.id);
		 		 /// Define the Activity Service  of the homekit accessories //	 	 

        this.TYFAN
         .getCharacteristic(Characteristic.On).onGet(this.getswitch.bind(this)).onSet(this.setswitch.bind(this)); 
		this.TYFAN
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.getdimmer.bind(this)).onSet(this.setdimmer.bind(this));  
	 return [infoService,this.TYFAN];
    }
	updatevalue(cs){
        console.log(this.id, cs);
		this.TYFAN.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
		this.TYFAN.getCharacteristic(Characteristic.RotationSpeed).updateValue(cs);
		
	}
}


class TYCURTAIN{
	constructor(macid,id,index){
      this.macid = macid;
	  this.id = 16+id;
	  this.index = index;
	  this.name = "TY Curtain-"+this.index;	 	  
	  this.TYCURTAIN = new Service.WindowCovering(this.index);	  
	}
	settargetstate(stt){ 
         trigger.setcurtain(this.macid, this.id, 1-(stt/100));
    }	
	gettargetstate(){   	
         return (1 - current_value[this.index])*100;	
	}
	getposition(stt){ 
         return 2;
    }	
	getcurrentstate(){   	
         return (1 - current_value[this.index])*100;	
	}
	 getServices(){
			      /// Define the infoservice of the homekit accesies //	 
 
       var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Toyama world")
         .setCharacteristic(Characteristic.Model, "Toyama Panel Switch")
         .setCharacteristic(Characteristic.SerialNumber, "TYSWT-"+this.macid + this.id);
		 		 /// Define the Activity Service  of the homekit accessories //	 	 

        this.TYCURTAIN
         .getCharacteristic(Characteristic.TargetPosition).onGet(this.gettargetstate.bind(this)).onSet(this.settargetstate.bind(this))
		 .setProps({
             minValue: 0,
             maxValue: 100,
             minStep: 100
            }); 
		this.TYCURTAIN
         .getCharacteristic(Characteristic.PositionState).onGet(this.getposition.bind(this))
         .setProps({
             minValue: 2,
             maxValue: 2,
             minStep: 2
            });  
		this.TYCURTAIN
         .getCharacteristic(Characteristic.CurrentPosition).onGet(this.getcurrentstate.bind(this))
		 .setProps({
             minValue: 0,
             maxValue: 100,
             minStep: 100
            }); 
	 return [infoService,this.TYCURTAIN];
    }
	updatevalue(cs){
                console.log("Curtain Update-", cs);
		this.TYCURTAIN.getCharacteristic(Characteristic.CurrentPosition).updateValue((1-cs)*100);
	}
}