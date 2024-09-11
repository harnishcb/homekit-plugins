var Service, Characteristic;
var net = require('net');
var convert = require('./color-convert');
var updated_token = [];
var current_state = [[0,0,0,false], [0,0,0,false], [0,0,0,false]];
var map = ["0","A"];


module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-smartnode-rgb", "Smartnode-RGB_1", sn);
}
function sn(log, config)
{
  this.log = log;
  this.token = config["token"] || "arbitary token";
  this.serial = config["Serial-No."];
  this.ip = config["IP-Address"];
  this.name = config["Name"];
}

sn.prototype.accessories = function(callback){

 updated_token.push(this.token);

 const gen = updated_token.length-1;
 const ip = this.ip;
 const serial = this.serial;
 var results = [];
 let client = new net.Socket();

 client.connect(13002, this.ip, function() {
	console.log('Connected to SN-RGB at IP='+ip);
	auto_fetch_status();
	setTimeout(() => auto_fetch_status(), 10000);
	setInterval(() => auto_fetch_status(), 60000);
    });


client.on('data', function(data) {
	try {
	console.log('\x1b[36m%s\x1b[0m',"Data received over TCP:::",data.toString());
	data = JSON.parse(data);
	if(data.cmd == "RGB"){
	       var temp = convert.rgb.hsv(data.R, data.G, data.B);
		     console.log(gen, temp, Boolean(map.indexOf(data.val)));
	       current_state[gen][0] = temp[0];
	       current_state[gen][1] = temp[1];
	       current_state[gen][2] = Number(data.brightness);
		     current_state[gen][3] = Boolean(map.indexOf(data.val));
		     results[0].update_state();
		}
	if(data.status == "token_invalid"){
			updated_token[gen] = data.A_tok;
	  }
	}catch(err){
		console.log(err);
	}
 });

 client.on('close', function() {
	console.log('Device Offline=',ip);
    setTimeout(() => client.connect({ port: 13002, host: ip }), 5000);
 });

client.on('error', function(err) {
       console.log('err=',ip)
});
//_____________________________________________________________________________________________________________________//

function auto_fetch_status(){
	var status_command = '{"cmd":"STS", "slave":"'+serial+'", "token":"'+updated_token[gen]+'"}';
	client.write(status_command);
 }


results.push(new SNRGB(this.serial,client,this.name, gen));
current_state.push([0,0,0,false]);
callback(results)
}



class SNRGB{
  constructor(serial, client, name, gen){
    this.serial = serial;
	this.gen = gen;
	this.client = client;
	this.name =  name;
    this.SNRGB = new Service.Lightbulb(this.name);
    }

//-------------------------------------------------------------------------------------	//
    set_snrgb_on(new_value){
	     var temp = convert.hsv.rgb(current_state[this.gen][0], current_state[this.gen][1], current_state[this.gen][2]); 
        if(new_value){
		   console.log(temp);
           this.client.write('{"cmd":"RGB","slave": "'+this.serial+'","token":"'+updated_token[this.gen]+'","val":"A","R":'+temp[0]+',"G":'+temp[1]+',"B":'+temp[2]+',"color":255,"brightness":'+current_state[this.gen][2]+',"id":0,"speed":0}');
           }
           else{
           this.client.write('{"cmd":"RGB","slave": "'+this.serial+'","token":"'+updated_token[this.gen]+'","val":"0","R":'+temp[0]+',"G":'+temp[1]+',"B":'+temp[2]+',"color":255,"brightness":'+current_state[this.gen][2]+',"id":0,"speed":0}');	
           }
    }

	get_snrgb_on(){
	  console.log(this.gen, current_state);
	  return current_state[this.gen][3];
	}

//-------------------------------------------------------------------------------------	//
    set_snrgb_brightness(new_value){
          current_state[this.gen][2] = new_value;
          var temp = convert.hsv.rgb(current_state[this.gen][0], current_state[this.gen][1], current_state[this.gen][2]); 
          this.client.write('{"cmd":"RGB","slave": "'+this.serial+'","token":"'+updated_token[this.gen]+'","val":"A","R":'+temp[0]+',"G":'+temp[1]+',"B":'+temp[2]+',"color":255,"brightness":'+current_state[this.gen][2]+',"id":0,"speed":0}');
	}
	get_snrgb_brightness(){
	   return current_state[this.gen][2];
	}

//------------------------------------------------------------------------------------- //

    set_snrgb_hue(new_value){
           current_state[this.gen][0] = new_value;
           var temp = convert.hsv.rgb(current_state[this.gen][0], current_state[this.gen][1], current_state[this.gen][2]);
           this.client.write('{"cmd":"RGB","slave": "'+this.serial+'","token":"'+updated_token[this.gen]+'","val":"A","R":'+temp[0]+',"G":'+temp[1]+',"B":'+temp[2]+',"color":255,"brightness":'+current_state[this.gen][2]+',"id":0,"speed":0}'); 
	}

	get_snrgb_hue(){
	   return current_state[this.gen][0];
	}

//------------------------------------------------------------------------------------- //

    set_snrgb_saturation(new_value){
           current_state[this.gen][1] = new_value;
           var temp = convert.hsv.rgb(current_state[this.gen][0], current_state[this.gen][1], current_state[this.gen][2]);
           this.client.write('{"cmd":"RGB","slave": "'+this.serial+'","token":"'+updated_token[this.gen]+'","val":"A","R":'+temp[0]+',"G":'+temp[1]+',"B":'+temp[2]+',"color":255,"brightness":'+current_state[this.gen][2]+',"id":0,"speed":0}'); 
	}

	get_snrgb_saturation(){
	   return current_state[this.gen][1];
	}

//------------------------------------------------------------------------------------- //

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "Smartnode-RGB")
         .setCharacteristic(Characteristic.SerialNumber,this.serial);
      this.SNRGB
         .getCharacteristic(Characteristic.On).onGet(this.get_snrgb_on.bind(this)).onSet(this.set_snrgb_on.bind(this));
      this.SNRGB
        .getCharacteristic(Characteristic.Brightness).onGet(this.get_snrgb_brightness.bind(this)).onSet(this.set_snrgb_brightness.bind(this));
      this.SNRGB
        .getCharacteristic(Characteristic.Hue).onGet(this.get_snrgb_hue.bind(this)).onSet(this.set_snrgb_hue.bind(this));
      this.SNRGB
        .getCharacteristic(Characteristic.Saturation).onGet(this.get_snrgb_saturation.bind(this)).onSet(this.set_snrgb_saturation.bind(this));		
	 return [infoService,this.SNRGB];
    }

	update_state(){
           this.SNRGB.getCharacteristic(Characteristic.On).updateValue(current_state[this.gen][3]);
           this.SNRGB.getCharacteristic(Characteristic.Hue).updateValue(current_state[this.gen][0]);
           this.SNRGB.getCharacteristic(Characteristic.Saturation).updateValue(current_state[this.gen][1]);
           this.SNRGB.getCharacteristic(Characteristic.Brightness).updateValue(current_state[this.gen][2]);
    }
}