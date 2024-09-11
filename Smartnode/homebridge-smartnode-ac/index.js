var Service, Characteristic;
const fs = require('fs');
var net = require('net');
let getIRCode = require('./GetIRCode.js')
const csv = require('./csv-parser');
var process = require("./ircode_process.js");
var updated_token = [];
//**     Array to store current status of thermostat   **///
var ac_swt =[];              // Stores On/Off state of each AC associated
var ac_temp = [];            // Stores current temperature of each AC associated
var ac_fan = [];              // Stores fan state of each AC associated
var ac_swg = [];             //  Stores swing state of each AC associated


//****    Stores the upper and lower thresholds of the each AC independently   **///

var min_temp = [];
var max_temp = [];
var fan_step = [];

//**         function exports the platform to homebridge ***//
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-smartnode-ac", "Smartnode_Device-IR_AC", AC);
}

function AC(log, config)
{
  this.log = log;
  this.ip = config["IP-Address"];                  /// Parameters that are imported from Config.json file
  this.device = config["device"];
  this.serial = config["Serial-No."];
  this.token = config["Token of Device"] || "AB228E279E8554DB17FF";
}
AC.prototype.accessories = function(callback){

	var udp = require('dgram');
    var client = udp.createSocket('udp4');
    var results = [];
	const log = this.log;
    updated_token.push(this.token);
    const gen = updated_token.length-1;
	const serial = this.serial;
    var ip = this.ip;
	let client_tcp = new net.Socket();
	client_tcp.connect(13002, this.ip);
	client_tcp.on('connect', () => {
		log.info('Connected to SN-BLaster at IP='+ip);
		auto_fetch_status();
		setTimeout(() => auto_fetch_status(), 10000);
	  });
	 client_tcp.on('data', (data) => {
        log.info(data.toString());
      try {
	    data = JSON.parse(data);
        log.info(JSON.stringify(data));
	    if(data.status == "token_invalid"){
		updated_token[gen] = data.A_tok;
	}
	}catch(err){
	//	console.log(err);
	}
    });

	client_tcp.on('close', function() {
		log.error();('Device Offline=',ip);
		setTimeout(() => client_tcp.connect({ port: 13002, host: ip }), 5000);
    });

	client_tcp.on('error', function(err) {
		log.error('err=',err);
	});

	function auto_fetch_status(){
			var status_command = '{"cmd":"STS", "slave":"'+serial+'", "token":"'+updated_token[gen]+'"}';
			client_tcp.write(status_command);
	}

	async function add (device, serial, log, ip) {
		for(var i=0;i<device.length;i++){
			ac_swt.push(0);
			ac_fan.push(100);
			ac_temp.push(22);
			let ac_char = await getIRCode.getcode(device[i].Brand, Number(device[i].Remote));
			console.log(ac_char)
			min_temp.push(ac_char[0]);
			max_temp.push(ac_char[1]);
			fan_step.push(25);
			if(device[i].Swing == "True"){
				results.push(new AirConditioner_WithSwing(device[i].Name, serial, gen, String(Math.pow(2 , parseInt(device[i].Channel)-1)), ip, ac_char[2]+'_'+device[i].Remote+'.csv', ac_temp.length-1, client, log));
				ac_swg.push(0);
			} else {
				results.push(new AirConditioner_WithoutSwing(device[i].Name, serial, gen, String(Math.pow(2 , parseInt(device[i].Channel)-1)), ip, ac_char[2]+'_'+device[i].Remote+'.csv', ac_temp.length-1, client, log));
				ac_swg.push(2);
			}
		}
	}
	add (this.device, this.serial, this.log, this.ip).then(() => {
		console.log('Launching the devices')
	    callback(results);
   });
}

class AirConditioner_WithoutSwing{
	constructor(name,serial,gen,channel,ip,ir_db,index,client,log){
      this.name = name;
	  this.serial = serial;
	  this.gen = gen;
	  this.channel = channel;
	  this.ip = ip;
	  this.ir_path = ir_db;
	  this.index  = index;
	  this.client = client;
	  this.log = log;
	  this.AirConditioner_WithoutSwing = new Service.HeaterCooler(this.name);
	}


	set_Active(stt){
	    ac_swt[this.index] = stt;
		if(process.timestamp(this.index)){
		fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	   if(String(row.temperature).toLowerCase() == String(Boolean(Number(stt)))){
          var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
          this.log.info('Turning the AC ->', stt);
		  this.client.send(data,13001,this.ip);
	   } else {
	//	this.log.info('No ir code detected in the file for switching the AC to ->', stt);
	   }
	   })
	   .on('end', () => {
       });
		}
	}
	get_Active(){
	 return ac_swt[this.index];
	}

	set_TargetHeaterCoolerState(stt){
		fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	   if(String(row.temperature).toLowerCase() == String(Boolean(Number(stt)))){
             var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
             this.client.send(data,13001,this.ip);
	   }
	   })
	   .on('end', () => {
       });
  	}
	get_TargetHeaterCoolerState(){
	  return 2;
	}

	get_RotationSpeed(){
	  return ac_fan[this.index];
	}
	set_RotationSpeed(stt){
	 ac_fan[this.index] = stt;
	 process.update(this.index);
       fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	    if(String(row.temperature) == String(ac_temp[this.index]) && String(row.fanspeed) == String(stt) && String(row.swing) == String(ac_swg[this.index])){ 
	         var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
             this.client.send(data,13001,this.ip);
	   }
	   })
	   .on('end', () => {
       });
	}

	get_CurrentHeaterCoolerState(){
      return ac_swt[this.index];
	}

	get_CurrentTemperature(){
		return ac_temp[this.index];
	}

	get_CoolingThresholdTemperature(){
      return ac_temp[this.index];
	}
	set_CoolingThresholdTemperature(stt){
		ac_temp[this.index] = stt;
		fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	    if(String(row.temperature) == String(stt) && String(row.fanspeed) == String(ac_fan[this.index]) && String(row.swing) == String(ac_swg[this.index])){
			 var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
             this.client.send(data,13001,this.ip);
	 }
	   })
	   .on('end', () => {
       });
	}


  getServices(){
    var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN-IRB/E")
         .setCharacteristic(Characteristic.SerialNumber, "cuecbtac");

    this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.Active).onGet(this.get_Active.bind(this)).onSet(this.set_Active.bind(this)); 
	this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.CurrentHeaterCoolerState).onGet(this.get_CurrentHeaterCoolerState.bind(this))
    this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.TargetHeaterCoolerState).onGet(this.get_TargetHeaterCoolerState.bind(this)).onSet(this.set_TargetHeaterCoolerState.bind(this)) 
         .setProps({
             minValue: 2,
             maxValue: 2,
             minStep: 1
           });
   this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.CurrentTemperature).onGet(this.get_CurrentTemperature.bind(this)) 
	     .setProps({
             minValue: min_temp[this.index],
             maxValue: max_temp[this.index],
             minStep: 1
           });
	this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.get_RotationSpeed.bind(this)).onSet(this.set_RotationSpeed.bind(this))
	     .setProps({
             minValue: 0,
             maxValue: 100,
             minStep: fan_step[this.index]
           });
	this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.CoolingThresholdTemperature).onGet(this.get_CoolingThresholdTemperature.bind(this)).onSet(this.set_CoolingThresholdTemperature.bind(this)) 
	     .setProps({
             minValue: min_temp[this.index],
             maxValue: max_temp[this.index],
             minStep: 1
           });
    	return [infoService,this.AirConditioner_WithoutSwing];
    }
}




class AirConditioner_WithSwing{
	constructor(name,serial,gen,channel,ip,ir_db,index,client,log){
		this.name = name;
		this.serial = serial;
		this.gen = gen;
		this.channel = channel;
		this.ip = ip;
		this.ir_path = ir_db;
		this.index = index;
		this.client = client;
		this.log = log;
		this.AirConditioner_WithSwing = new Service.HeaterCooler(this.name);
	}
	set_Active(stt){
	    ac_swt[this.index] = stt;
        var code;
		this.log.info('Turning AC:',stt)
	if(process.timestamp(this.index)){
	fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	   if(!Boolean(stt) && String(row.temperature).toLowerCase() == 'x'){
		this.log.info('IR code to send', row.code);
        var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
        this.client.send(data,13001,this.ip);
	   }
	   else if(Boolean(stt) && String(row.temperature) == "22" && String(row.fanspeed) == "100"){
		this.log.info('IR code to send', row.code);
		var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
		this.client.send(data,13001,this.ip);
	   }
	   })
	   .on('end', () => {
       });
		}
	}
	get_Active(){
	 return ac_swt[this.index];
	}

	set_TargetHeaterCoolerState(stt){
	   fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	   if(String(row.temperature).toLowerCase() == String(Boolean(Number(stt)))){
             var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
             this.client.send(data,13001,this.ip);
	   }
	   })
	   .on('end', () => {
       });
  	}
	get_TargetHeaterCoolerState(){
	  return 2;
	}

	set_RotationSpeed(stt){
	  ac_fan[this.index] = stt;
	   process.update(this.index);
		fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	    if(String(row.temperature) == String(ac_temp[this.index]) && String(row.fanspeed) == String(stt) && String(row.swing) == String(ac_swg[this.index])){ 
	         var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
             this.client.send(data,13001,this.ip);
	   }
	   })
	   .on('end', () => {
       });
	}
	get_RotationSpeed(){
		return ac_fan[this.index];
	  }

	get_CurrentHeaterCoolerState(){
      return ac_swt[this.index];
	}

	set_CoolingThresholdTemperature(stt){
		ac_temp[this.index] = stt;
		fs.createReadStream(this.ir_path)
        .pipe(csv())
        .on('data', (row) => {
	    if (String(row.temperature) == String(stt) && String(row.fanspeed) == String(ac_fan[this.index]) && String(row.swing) == String(ac_swg[this.index])) {
			var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
			this.client.send(data,13001,this.ip);
	    }
	   })
	   .on('end', () => {
       });
	}
	get_CoolingThresholdTemperature(){
		return ac_temp[this.index];
	  }

    get_SwingMode(){
      return ac_swg[this.index];
	}
	set_SwingMode(stt){
		ac_swg[this.index] = stt;
       fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	    if(String(row.temperature) == String(ac_temp[this.index]) && String(row.fanspeed) == String(ac_fan[this.index]) && String(row.swing) == String(stt)){ 
	     var data = Buffer.from('{"cmd":"IRT","slave":"'+this.serial+'","token":"'+updated_token[this.gen]+'","protocol":"RAW","frequency":'+row.frequency+',"channel":"'+this.channel+'","code":['+row.code+'],"unique_cycle":['+row.unique_cycle+']}');
             this.client.send(data,13001,this.ip);
	 }
	   })
	   .on('end', () => {
       });
	}

	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN-IRB/E")
         .setCharacteristic(Characteristic.SerialNumber, "cuecbtac");
      this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.Active).onGet(this.get_Active.bind(this)).onSet(this.set_Active.bind(this)); 
      this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.CurrentHeaterCoolerState).onGet(this.get_CurrentHeaterCoolerState.bind(this));
      this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.TargetHeaterCoolerState).onGet(this.get_TargetHeaterCoolerState.bind(this)).onSet(this.set_TargetHeaterCoolerState.bind(this)) 
         .setProps({
             minValue: 2,
             maxValue: 2,
             minStep: 1
           });
      this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.CurrentTemperature).onGet(this.get_CoolingThresholdTemperature.bind(this))
	     .setProps({
             minValue: min_temp[this.index],
             maxValue: max_temp[this.index],
             minStep: 1
           });
	  this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.get_RotationSpeed.bind(this)).onSet(this.set_RotationSpeed.bind(this))
	     .setProps({
             minValue: 0,
             maxValue: 100,
             minStep: fan_step[this.index]
           });
	  this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.CoolingThresholdTemperature).onGet(this.get_CoolingThresholdTemperature.bind(this)).onSet(this.set_CoolingThresholdTemperature.bind(this)) 
	     .setProps({
             minValue: min_temp[this.index],
             maxValue: max_temp[this.index],
             minStep: 1
           });
	  this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.SwingMode).onGet(this.get_SwingMode.bind(this)).onSet(this.set_SwingMode.bind(this));
    	return [infoService,this.AirConditioner_WithSwing];
    }
}
