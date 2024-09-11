var Service, Characteristic;
const rest =  require("./rest.js");
const color_convert = require("./color-convert");
var net = require('net');
var current_state = [];
var device_index = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-rako_hub-Color", "Rako_Hub-Color", rako);
}  
function rako(log, config) 
{
   /* Mandatory Parameters */	
   this.serial = config["Serial-No."];
   this.ip = config["IP-Address-of-Rako-Hub"]; 
   this.plugin_ip = config["IP-Address-of-Manger-Hub"] || 'localhost';
   this.color = config["Color"];

   /* Logs */
   this.log = log;
}

rako.prototype.accessories = function(callback){

	var results = [];
	const ip = this.ip;
	var plugin_ip = this.plugin_ip;

	let client = new net.Socket();
    client.connect(9762,  plugin_ip, function() {
	 console.log('Color Platform Connected to Device Manager');
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
	console.log('Color Platform Disconnected from Device Manager');
    });

    client.on('error', function(err) {  
       console.log('err=',err)
	   setTimeout(() => client.connect({ port: 9762, host: plugin_ip }), 5000);
    });

 
for(var i=0;i<this.color.length;i++){
	       current_state.push([180,100,0]);
	       var temp_device_locate = this.color[i]["Room"]+this.color[i]["R-Channel"];
	       device_index.push(temp_device_locate);
		   results.push(new RAKOCOLOR(ip, this.color[i]["Room"], this.color[i]["R-Channel"], this.color[i]["G-Channel"], this.color[i]["B-Channel"], this.color[i]["W-Channel"],  this.color[i]["Name"], device_index.indexOf(temp_device_locate)));
 }
 callback(results)
}

class RAKOCOLOR{
	constructor(ip,room,Rchannel,Gchannel,Bchannel,Wchannel,name,index){
	this.ip = ip;
	this.room = room;
	this.Rchannel = Rchannel;
	this.Gchannel = Gchannel;
	this.Bchannel = Bchannel;
	this.Wchannel = Wchannel;
	this.name =  name;
	this.index = current_state[index];
	this.RAKOCOLOR = new Service.Lightbulb(this.name);
	}	

	seton(stt){   
	 var url;	     
     if(stt){
		var url;
		//var rgb = color_convert.hsv.rgb(this.index[0], this.index[1], this.index[2]);
	                url = "/rako.cgi?room="+this.room+"&ch="+this.Rchannel+"&lev=255";
			rest.set(url,this.ip);
		        setTimeout(() => {
			url = "/rako.cgi?room="+this.room+"&ch="+this.Gchannel+"&lev=255";
			rest.set(url,this.ip);
			},100);
			setTimeout(() => {
			url = "/rako.cgi?room="+this.room+"&ch="+this.Bchannel+"&lev=255";
			rest.set(url,this.ip);
			},200);
			setTimeout(() => {
			url = "/rako.cgi?room="+this.room+"&ch="+this.Wchannel+"&lev=255";
			rest.set(url,this.ip);
			},300);
	 } 
	 else {
		url = "/rako.cgi?room="+this.room+"&ch="+this.Rchannel+"&lev=0";
		rest.set(url,this.ip);
		url = "/rako.cgi?room="+this.room+"&ch="+this.Gchannel+"&lev=0";
		rest.set(url,this.ip);
		url = "/rako.cgi?room="+this.room+"&ch="+this.Bchannel+"&lev=0";
		rest.set(url,this.ip);
		url = "/rako.cgi?room="+this.room+"&ch="+this.Wchannel+"&lev=0";
		rest.set(url,this.ip);
	 }
	}	
    geton(){    		
        return Boolean(this.index[2]);	
   	}	

	setbrightness(stt){
		var url;
		this.index[2] = stt;
		var rgb = color_convert.hsv.rgb(this.index[0], this.index[1], stt);
		url = "/rako.cgi?room="+this.room+"&ch="+this.Rchannel+"&lev="+String(rgb[0]);
		rest.set(url,this.ip);
		setTimeout(() => {
			url = "/rako.cgi?room="+this.room+"&ch="+this.Gchannel+"&lev="+String(rgb[1]);
			rest.set(url,this.ip);
			},100);
			setTimeout(() => {
			url = "/rako.cgi?room="+this.room+"&ch="+this.Bchannel+"&lev="+String(rgb[2]);
			rest.set(url,this.ip);
			},200);
			setTimeout(() => {
			url = "/rako.cgi?room="+this.room+"&ch="+this.Wchannel+"&lev=0";
			rest.set(url,this.ip);
			},300);
	}
	getbrightness(){
		return this.index[2];	
	}
    
	sethue(stt){
		var url;
		this.index[0] = stt;
		var rgb = color_convert.hsv.rgb(stt, this.index[1], this.index[2]);
		url = "/rako.cgi?room="+this.room+"&ch="+this.Rchannel+"&lev="+String(rgb[0]);
		rest.set(url,this.ip);
		setTimeout(() => {
		url = "/rako.cgi?room="+this.room+"&ch="+this.Gchannel+"&lev="+String(rgb[1]);
		rest.set(url,this.ip);
		},100);
		setTimeout(() => {
		url = "/rako.cgi?room="+this.room+"&ch="+this.Bchannel+"&lev="+String(rgb[2]);
		rest.set(url,this.ip);
		},200);
		setTimeout(() => {
		url = "/rako.cgi?room="+this.room+"&ch="+this.Wchannel+"&lev=0";
		rest.set(url,this.ip);
		},300);
	}
	gethue(){
		return this.index[0];	
	}

	setsaturation(stt){
		var url;
		this.index[1] = stt;
		var rgb = color_convert.hsv.rgb(this.index[0],stt,this.index[2]);
		url = "/rako.cgi?room="+this.room+"&ch="+this.Rchannel+"&lev="+String(rgb[0]);
		rest.set(url,this.ip);
		setTimeout(() => {
			url = "/rako.cgi?room="+this.room+"&ch="+this.Gchannel+"&lev="+String(rgb[1]);
			rest.set(url,this.ip);
			},100);
			setTimeout(() => {
			url = "/rako.cgi?room="+this.room+"&ch="+this.Bchannel+"&lev="+String(rgb[2]);
			rest.set(url,this.ip);
			},200);
			setTimeout(() => {
			url = "/rako.cgi?room="+this.room+"&ch="+this.Wchannel+"&lev=0";
			rest.set(url,this.ip);
			},300);
	}
	getsaturation(){
		return this.index[1];	
	}
	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Rako Controls")
         .setCharacteristic(Characteristic.Model, "RakoDimmer")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.RAKOCOLOR
         .getCharacteristic(Characteristic.On).onGet(this.geton.bind(this)).onSet(this.seton.bind(this)); 
	/*  this.RAKOCOLOR
         .getCharacteristic(Characteristic.Brightness).onGet(this.getbrightness.bind(this)).onSet(this.setbrightness.bind(this));
      this.RAKOCOLOR
         .getCharacteristic(Characteristic.Hue).onGet(this.gethue.bind(this)).onSet(this.sethue.bind(this));
      this.RAKOCOLOR
         .getCharacteristic(Characteristic.Saturation).onGet(this.getsaturation.bind(this)).onSet(this.setsaturation.bind(this));		 
	*/
	   return [infoService,this.RAKOCOLOR];
    }
	
	update_state(cs){
		this.RAKOCOLOR.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
	//	this.RAKOCOLOR.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(cs/2.55));
    }
}
