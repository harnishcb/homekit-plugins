var Service, Characteristic;
var results =[];
var convert = require('./color-convert');
var hsv = [];
module.exports = function (homebridge) {
   Service = homebridge.hap.Service;
   Characteristic = homebridge.hap.Characteristic;
   homebridge.registerPlatform("homebridge-zemote-rgb_1", "Zemote_Driver-RGB", zm);
}

function zm(log, config) 
{
  this.log = log; 
  this.device = config["Device"];
}
zm.prototype.accessories = function(callback){   
	
	for(var i=0;i<this.device.length;i++){
	results.push(new zmrgb(this.device[i]["RGB-Name"], this.device[i]["Token-No."] ,this.device[i]["IP-Address"],i));	
	hsv.push([0,0,0]);
	}

	callback(results);
}

class zmrgb{
	constructor(name, key, ip, id){
		this.name = name;
		this.key = key;
		this.IP = ip;
		this.id = id;
	    this.zmrgb = new Service.Lightbulb(this.name);	
	}
	setzmrgb(stt){
      var rgb;  
   	  rgb = convert.hsv.rgb(0, 0, Number(stt)*50);		
	  tcp1(rgb,this.IP,this.key);
	}
	setzmrgbval(stt){
	 hsv[this.id][2] = stt;
     var rgb = convert.hsv.rgb(hsv[0], hsv[1], stt);	
	 tcp1(rgb,this.IP,this.key);	
	}
	setzmrgbhue(stt){
	  hsv[this.id][0] = stt;
      var rgb = convert.hsv.rgb(stt, hsv[1], hsv[2]);	
	  tcp1(rgb,this.IP,this.key);
	}
	setzmrgbsat(stt){
	  hsv[this.id][1] = stt;
	  var rgb = convert.hsv.rgb(hsv[0], stt, hsv[2]);	
	  tcp1(rgb,this.IP,this.key);
	}
	
	getzmrgb(){	
	return hsv[this.id][1];
	}
	
	getzmrgbval(){
	 return  hsv[this.id][2]	;		
	}

	getzmrgbhue(){
	 return  hsv[this.id][0];		
	}

	getzmrgbsat(){
	 return hsv[1];		
	}
	
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket")
         .setCharacteristic(Characteristic.Model, "ZMRGB")
         .setCharacteristic(Characteristic.SerialNumber, "zmhsv");
      this.zmrgb
         .getCharacteristic(Characteristic.On).onGet(this.getzmrgb.bind(this)).onSet(this.setzmrgb.bind(this)); 
	  this.zmrgb
         .getCharacteristic(Characteristic.Brightness).onGet(this.getzmrgbval.bind(this)).onSet(this.setzmrgbval.bind(this)); 
	  this.zmrgb
         .getCharacteristic(Characteristic.Hue).onGet(this.getzmrgbhue.bind(this)).onSet(this.setzmrgbhue.bind(this)); 
	  this.zmrgb
         .getCharacteristic(Characteristic.Saturation).onGet(this.getzmrgbsat.bind(this)).onSet(this.setzmrgbsat.bind(this)); 
	 
	 return [infoService,this.zmrgb];
    }
	
}

function tcp1(rgb,iP,key){
	var cur = rgb[0].toString();
	  if(cur.length == 1){
		 cur = "00"+cur;
		 } 
	  else if(cur.length == 2){
		 cur = "0"+cur;
		  }
		
	   
		var cur1 = rgb[1].toString();
		   if(cur1.length == 1){
		 cur1 = "00"+cur1;
		 } 
	  else if(cur1.length == 2){
		 cur1 = "0"+cur1;
		  }
		


	var cur2 = rgb[2].toString();
	  if(cur2.length == 1){
		 cur2 = "00"+cur2;
		 } 
	  else if(cur2.length == 2){
		 cur2 = "0"+cur2;
		  }
	   
const Net = require('net');
	const client = new Net.Socket();
var send  = key+"#%C"+cur+","+cur1+","+cur2+".";
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
