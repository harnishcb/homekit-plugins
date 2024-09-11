var Service, Characteristic;
var net = require('net');
var current_value = [];
var updated_token = [];
var chn_node = [["1","2","3"], ["4","5","6"]];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-smartnode-curtain", "Smartnode_Device-Curtain", sn);
}
function sn(log, config)
{
  this.log = log;
  this.token = config["Token of Device"] || "arbitary_token";
  this.serial = config["Serial-No."];
  this.ip = config["IP-Address"];
  this.name = config["Curtain-Name"];
  this.total_channel = config["Total-Channel"];
}

sn.prototype.accessories = function(callback){

updated_token.push(this.token);
const ip = this.ip;
const serial = this.serial;
var results = [];
const gen = updated_token.length-1;

var total_channel = this.total_channel;

let client = new net.Socket();
client.connect(13002, this.ip, function() {
	console.log('Connected to Curtain', ip);
  auto_fetch_status();
	setTimeout(() => auto_fetch_status(), 10000);
	setInterval(() => auto_fetch_status(), 60000);
});

client.on('data', function(data) {
	try {
	data = JSON.parse(data);
  console.log(JSON.stringify(data));
	if(data.cmd == "STS"){
	console.log('Received: '+'cmd_type=STS, val='+data.val+' Dimmer='+data.dimmer+' ip='+ip);
	}
	if(data.cmd == "SET"){
	    console.log('Received: Node='+data.node+'  cmd_type=SET, cmd_source='+data.by+' val='+data.val+' Dimmer='+data.dimmer);
      var temp_index_1 = chn_node[0].indexOf(String(data.node));
      var temp_index_2 = chn_node[1].indexOf(String(data.node));
      if(temp_index_1 != -1 && temp_index_1 != 2){
        results[0].updatevalue(temp_index_1*100);
        current_value[gen][0] = temp_index_1*100;
      }
      else if(temp_index_2 != -1 && temp_index_2 != 2){
        results[1].updatevalue(temp_index_2*100);
        current_value[gen][1] = temp_index_2*100;

      }
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


function auto_fetch_status(){
	var status_command = '{"cmd":"STS", "slave":"'+serial+'", "token":"'+updated_token[gen]+'"}';
	client.write(status_command);
 }


if(Number(total_channel) == 1){
  results.push(new SNCURTAIN(this.serial,client,gen,this.name,0));
  current_value.push([0]);
}
else if(Number(total_channel) == 2){
  results.push(new SNCURTAIN(this.serial,client,gen,this.name,0));
  results.push(new SNCURTAIN(this.serial,client,gen,this.name,1));
  current_value.push([0,0]);
}
 callback(results)
}


class SNCURTAIN{
	constructor(serial, client, node, name, chn){
	this.node = node;
	this.client = client;
  this.serial = serial;
  this.chn = chn;
	this.name =  "SN-"+name+String(this.chn);
  this.SNCURTAIN = new Service.WindowCovering(this.name);
	}
	setcurtain(stt){
     this.client.write('{"cmd":"UPD","slave":"'+this.serial+'","token":"'+updated_token[this.node]+'","by":"Apple-Home","node":'+chn_node[this.chn][stt/100]+',"val":"A","d_val":"255"}');	
    }
  getcurtain(){
     return current_value[this.node][this.chn];
	 }
	getposition(){
	   return 2;
	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN-Curtain")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
     this.SNCURTAIN
     .getCharacteristic(Characteristic.CurrentPosition).onGet(this.getcurtain.bind(this))
		 .setProps({
      validValues : [0,100]
         });
     this.SNCURTAIN
     .getCharacteristic(Characteristic.TargetPosition).onGet(this.getcurtain.bind(this)).onSet(this.setcurtain.bind(this))
	   .setProps({
      validValues : [0,100]
         });
      this.SNCURTAIN
     .getCharacteristic(Characteristic.PositionState).onGet(this.getposition.bind(this))
     .setProps({
      validValues : [2]
     });
	 return [infoService,this.SNCURTAIN];
    }

	updatevalue(cs){
    this.SNCURTAIN.getCharacteristic(Characteristic.TargetPosition).updateValue(cs);
	  this.SNCURTAIN.getCharacteristic(Characteristic.CurrentPosition).updateValue(cs);
    }
}