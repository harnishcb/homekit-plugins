var Service, Characteristic;
var posst = [1,1,1,1,1,1,1,1,1];
var memory= [1,1,1,1,1,1,1,1,1];
var gen_index = []
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-zemote-curtain_2", "Zemote_Curtain-2", zemote);
};

function zemote(log,config){
	this.ip = config["IP-Address"];
	this.key  = config["Token-No."];
	this.name = config["Panel-Name"];
    this.time = config["Time"] || 60;
	this.gen =  config["gen"];
}

zemote.prototype.accessories = function(callback){
 var results =[];
 gen_index.push("update");
 var gen = gen_index.length-1;
 results.push(new curtain(this.name,this.key,this.ip,this.time,gen,"0"));
 results.push(new curtain(this.name,this.key,this.ip,this.time,gen,"1"));
 callback(results);
}

class curtain{
	constructor(name, key, ip, time,gen,channel){
		this.key = key;
		this.IP = ip;
		this.time = String(time);
		this.gen = gen;
		this.channel = channel
		this.name = name+':'+channel
	    this.curtain = new Service.WindowCovering(this.name);	
	}
	settp(stt){
         var set= this.time;    
          if(stt == 100){
		   posst[(this.gen*2)+Number(this.channel)] = 1;
	     }
	     else {
		   posst[(this.gen*2)+Number(this.channel)] = 2;
	     }
      memory[(this.gen*2)+Number(this.channel)]= stt;       
	  if(set.length == 1){
		  set = "0"+set+"0";
	  }
	  else if(set.length == 2){
		  set = set+"0";
	  }
	  else{
		  set= set;
	  }
     this.curtain.setCharacteristic(Characteristic.CurrentPosition, stt);
     this.curtain.setCharacteristic(Characteristic.PositionState, 2);	  
     tcp1(set,this.IP,this.key,this.gen,this.channel);
	}	
	getcp(){
	return memory[(this.gen*2)+Number(this.channel)];	
	}
	gettp(){
	return memory[(this.gen*2)+Number(this.channel)];	
	}
	getps(){
	return 2;	
}		
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket")
         .setCharacteristic(Characteristic.Model, "Zemote")
         .setCharacteristic(Characteristic.SerialNumber, "Curtain");		 
	  this.curtain
         .getCharacteristic(Characteristic.CurrentPosition).onGet(this.getcp.bind(this)) 
          .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: 100
         });
	  this.curtain
         .getCharacteristic(Characteristic.TargetPosition).onGet(this.gettp.bind(this)).onSet(this.settp.bind(this))
         .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: 100
         });		 
      this.curtain
         .getCharacteristic(Characteristic.PositionState).onGet(this.getps.bind(this))       
	   return [infoService,this.curtain];
}
}

function tcp1(set,iP,key,gen,channel){
	const Net = require('net');
    const client = new Net.Socket();
	var send  = key+"07#%"+channel+posst[(gen*2)+Number(channel)].toString()+set;
    console.log(send);
	client.connect({ port: 50505, host: iP }, function(){   
    console.log('TCP connection established by sender');
    client.write(send);    
});
 client.setTimeout(1000);
 client.on('data', function(rec){
	console.log(String(rec)); 
	client.destroy();
});
 client.on('timeout', () => {
    client.destroy();
});	
client.on('error', (err) => {
    client.destroy();
});
}
