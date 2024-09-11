var Service, Characteristic;
var results =[];
var current_state = [];
module.exports = function (homebridge) {
   Service = homebridge.hap.Service;
   Characteristic = homebridge.hap.Characteristic;
   homebridge.registerPlatform("homebridge-zemote-strip_1", "Zemote_Strip-1", zm);
}

function zm(log, config) 
{
  this.log = log; 
  this.device = config["Device"];
}
zm.prototype.accessories = function(callback){   
	
	for(var i=0;i<this.device.length;i++){
	results.push(new zmstrip(this.device[i]["Strip-Name"], this.device[i]["Token-No."] ,this.device[i]["IP-Address"],i));	
	current_state.push(0);
	}

	callback(results);
}

class zmstrip{
	constructor(name, key, ip, id){
	  this.name = name;
	  this.key = key;
	  this.IP = ip;
	  this.id = id;
	  this.zmstrip = new Service.Lightbulb(this.name);	
	}
	setzmstrip(stt){
          var rgb;  
	  setTimeout(() =>	{
	  if(current_state[this.id] == 0 && Boolean(stt) == true){	
	  tcp1(Math.round(Number(stt)*255),this.IP,this.key);
	  }
		  else if(Boolean(stt) == false){
			  	  tcp1(0,this.IP,this.key);
		  }
	  else{
	  tcp1(Math.round(current_state[this.id]*2.55),this.IP,this.key);		  
	  }
	},500);
	}
	setzmstripval(stt){
	 current_state[this.id] = stt;	
	 tcp1(Math.round(stt*2.55),this.IP,this.key);	
	}
	
	getzmstrip(){	
	return Boolean(current_state[this.id]);
	}
	
	getzmstripval(){
	 return current_state[this.id];		
	}
	
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket")
         .setCharacteristic(Characteristic.Model, "zmstrip")
         .setCharacteristic(Characteristic.SerialNumber, "zmhsv");
      this.zmstrip
         .getCharacteristic(Characteristic.On).onGet(this.getzmstrip.bind(this)).onSet(this.setzmstrip.bind(this)); 
	  this.zmstrip
         .getCharacteristic(Characteristic.Brightness).onGet(this.getzmstripval.bind(this)).onSet(this.setzmstripval.bind(this)); 
	 
	 return [infoService,this.zmstrip];
    }
	
}

function tcp1(val,iP,key){
	var cur = val.toString();
	cur = ("000"+cur).slice(-3);   
const Net = require('net');
	const client = new Net.Socket();
var send  = key+"#%C"+cur+",000,000.";
	console.log(send);
client.connect({ port: 50505, host: iP }, function() {   
console.log('TCP connection established by sender');
client.write(send);
//  client.destroy();

});
client.setTimeout(25000);
client.on('data', function(rec){
//console.log(rec); 
client.destroy();
});
client.on('timeout', () => {
// console.log('socket timeout');
client.destroy();
});
client.on('error', (err) => {
console.log(err);
client.destroy();
});	
}
