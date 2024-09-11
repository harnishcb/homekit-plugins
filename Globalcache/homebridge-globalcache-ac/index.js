var Service, Characteristic;
const fs = require('fs');
const csv = require('csv-parser');
var process = require("./ircode_process.js");
var ac_swt =[];
var ac_temp = [];
var ac_fan = [];
var ac_swg = [];
var min_temp = [];
var max_temp = [];
var fan_step = [];
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-globalcache-ac", "Globalcache", AC);
}
function AC(log, config) 
{
  this.log = log;
  this.ip = config["IP-Address"];
  this.device = config["device"];
}
AC.prototype.accessories = function(callback){
   let Net = require('net');
   let client = new Net.Socket();
   var ip = this.ip
   var results = [];

client.connect(4998, this.ip, function() {
	console.log('Connected to GlobalCache at IP='+ip);
  });
 client.on('data', function(data) {
	console.log("Data Received from GlobalCache:",data.toString());
 });
 client.on('close', function() {
	console.log('GlobalCache Device Offline=',ip);
    setTimeout(() => client.connect({ port: 4998, host: ip }), 5000);
 });

client.on('error', function(err) {
	console.log('err='+ip);
 });

	for(var i=0;i<this.device.length;i++){
	if(this.device[i].Swing == "True"){
	results.push(new AirConditioner_WithSwing(this,this.device[i]["Port-No."],this.device[i].IR_File,ac_temp.length,client));
	ac_swg.push(0);
	}
	else{
	results.push(new AirConditioner_WithoutSwing(this,this.device[i]["Port-No."],this.device[i].IR_File,ac_temp.length,client));
	ac_swg.push(2);
	}
	ac_swt.push(0);
	ac_fan.push(Math.round(100/this.device[i].Fan_Step));
	ac_temp.push(22);
	min_temp.push(this.device[i].Minumum_Temperature);
	max_temp.push(this.device[i].Maximum_Temperature);
	fan_step.push(Math.round(100/this.device[i].Fan_Step));	
	}
	callback(results);
}


class AirConditioner_WithoutSwing{
	constructor(platform,port,ir_db,index,client){
      this.platform = platform;
	  this.port = port;
	  this.ir_path = ir_db;
	  this.index  = index;
	  this.client = client;
	  this.name = "AC-"+this.index;
	  this.AirConditioner_WithoutSwing = new Service.HeaterCooler(this.name);
	}
	set_ac_switch(stt){
	    ac_swt[this.index] = stt;
		var code;
		if(process.timestamp(this.index)){
		fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	   if(String(row.temperature).toLowerCase() == String(Boolean(Number(stt)))){ 
             code = row.code.replace(":1",":"+this.port);
             this.client.write(code+'\r');
	   }
	   })
	   .on('end', () => {
       });
		}
	}
	get_ac_switchstatus(){
	 return ac_swt[this.index];
	}
	set_ac_mode(stt){
        var code;
		fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	   if(String(row.temperature).toLowerCase() == String(Boolean(Number(stt)))){
             code = row.code.replace(":1",":"+this.port);
             this.client.write(code+'\r');
	   }
	   })
	   .on('end', () => {
       });
  	}
	get_ac_mode(){
	  return 2;
	}
	get_ac_fanspeed(){
	  return ac_fan[this.index];
	}
	set_ac_fanspeed(stt){
	 ac_fan[this.index] = stt;
	 process.update(this.index);
       var code;
       fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	    if(String(row.temperature) == String(ac_temp[this.index]) && String(row.fanspeed) == String(stt) && String(row.swing) == String(ac_swg[this.index])){ 
	             code = row.code.replace(":1",":"+this.port);
                 this.client.write(code+'\r');
	   }
	   })
	   .on('end', () => {
       });
	}
	get_ac_currentmode(){
      return ac_swt[this.index];
	}

	get_ac_temp(){
     return ac_temp[this.index];
	}
	set_ac_temp(stt){
		ac_temp[this.index] = stt;
        var code;
		fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	    if(String(row.temperature) == String(stt) && String(row.fanspeed) == String(ac_fan[this.index]) && String(row.swing) == String(ac_swg[this.index])){
	        code = row.code.replace(":1",":"+this.port);
            this.client.write(code+'\r');
	 }
	   })
	   .on('end', () => {
       });
	}
	 getServices(){
    var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "GlobalCache")
         .setCharacteristic(Characteristic.Model, "GCIP2IR")
         .setCharacteristic(Characteristic.SerialNumber, "CBTAC-"+this.index);
    this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.Active).onGet(this.get_ac_switchstatus.bind(this)).onSet(this.set_ac_switch.bind(this));
	this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.CurrentHeaterCoolerState).onGet(this.get_ac_currentmode.bind(this))
		 .setProps({
			validValues : [0,3]
           });
	this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.TargetHeaterCoolerState).onGet(this.get_ac_mode.bind(this)).onSet(this.set_ac_mode.bind(this))
         .setProps({
			validValues : [2]
           });
   this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.CurrentTemperature).onGet(this.get_ac_temp.bind(this))
	     .setProps({
             minValue: min_temp[this.index],
             maxValue: max_temp[this.index],
             minStep: 1
           });
	this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.get_ac_fanspeed.bind(this)).onSet(this.set_ac_fanspeed.bind(this))
	     .setProps({
             minValue: 0,
             maxValue: 100,
             minStep: fan_step[this.index]
           });
	this.AirConditioner_WithoutSwing
         .getCharacteristic(Characteristic.CoolingThresholdTemperature).onGet( this.get_ac_temp.bind(this)).onSet(this.set_ac_temp.bind(this)) 
	     .setProps({
             minValue: min_temp[this.index],
             maxValue: max_temp[this.index],
             minStep: 1
           });
    	return [infoService,this.AirConditioner_WithoutSwing];
    }
}

class AirConditioner_WithSwing{
	constructor(platform,port,ir_db,index,client){
      this.platform = platform;
	  this.port = port;
	  this.ir_path = ir_db;
	  this.index  = index;
	  this.client = client;
	  this.name = "AC-"+this.index;
	  this.AirConditioner_WithSwing = new Service.HeaterCooler(this.name);
	}
	set_ac_switch(stt){
	    ac_swt[this.index] = stt;
        var code;
	if(process.timestamp(this.index)){
	fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	   if(String(row.temperature).toLowerCase() == String(Boolean(Number(stt)))){
             code = row.code.replace(":1",":"+this.port);
             this.client.write(code+'\r')
	   }
	   })
	   .on('end', () => {
       });
		}
	}
	get_ac_switchstatus(){
	 return ac_swt[this.index];
	}

	set_ac_mode(stt){
        var code;
	   fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	   if(String(row.temperature).toLowerCase() == String(Boolean(Number(stt)))){
             code = row.code.replace(":1",":"+this.port);
             this.client.write(code+'\r')
	   }
	   })
	   .on('end', () => {
       });
  	}

	get_ac_mode(){
	  return 2;
	}
	get_ac_fanspeed(){
	  return ac_fan[this.index];
	}
	set_ac_fanspeed(stt){
	  ac_fan[this.index] = stt;
	   process.update(this.index);
       var code;
		fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	    if(String(row.temperature) == String(ac_temp[this.index]) && String(row.fanspeed) == String(stt) && String(row.swing) == String(ac_swg[this.index])){ 
	             code = row.code.replace(":1",":"+this.port);
                 this.client.write(code+'\r');
	   }
	   })
	   .on('end', () => {
       });	
	}
	get_ac_currentmode(){
     return ac_swt[this.index];
	}

	get_ac_temp(){
     return ac_temp[this.index];
	}
	set_ac_temp(stt){
		ac_temp[this.index] = stt;
        var code;
		fs.createReadStream(this.ir_path)
        .pipe(csv())
        .on('data', (row) => {
	    if(String(row.temperature) == String(stt) && String(row.fanspeed) == String(ac_fan[this.index]) && String(row.swing) == String(ac_swg[this.index])){ 
	             code = row.code.replace(":1",":"+this.port);
                 this.client.write(code+'\r');
	 }
	   })
	   .on('end', () => {
       });
	}
    get_swingmode(){
      ac_swg[this.index];
	}
	set_swingmode(stt){
		ac_swg[this.index] = stt;
        var code;
       fs.createReadStream(this.ir_path)
       .pipe(csv())
       .on('data', (row) => {
	    if(String(row.temperature) == String(ac_temp[this.index]) && String(row.fanspeed) == String(ac_fan[this.index]) && String(row.swing) == String(stt)){ 
	             code = row.code.replace(":1",":"+this.port);
                 this.client.write(code+'\r');
	 }
	   })
	   .on('end', () => {
       });
	}


	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Globalcache")
         .setCharacteristic(Characteristic.Model, "Itach IP2IR")
         .setCharacteristic(Characteristic.SerialNumber, "GCAC-");
    this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.Active).onGet(this.get_ac_switchstatus.bind(this)).onSet(this.set_ac_switch.bind(this)); 
	this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.CurrentHeaterCoolerState).onGet(this.get_ac_currentmode.bind(this))
		 .setProps({
			validValues : [0,3]
           });
    this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.TargetHeaterCoolerState).onGet(this.get_ac_mode.bind(this)).onSet(this.set_ac_mode.bind(this)) 
         .setProps({
			validValues : [2]
           });
   this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.CurrentTemperature).onGet(this.get_ac_temp.bind(this))
	     .setProps({
             minValue: min_temp[this.index],
             maxValue: max_temp[this.index],
             minStep: 1
           });
	this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.get_ac_fanspeed.bind(this)).onSet(this.set_ac_fanspeed.bind(this))
	     .setProps({
             minValue: 0,
             maxValue: 100,
             minStep: fan_step[this.index]
           });
	this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.CoolingThresholdTemperature).onGet(this.get_ac_temp.bind(this)).onSet(this.set_ac_temp.bind(this)) 
	     .setProps({
             minValue: min_temp[this.index],
             maxValue: max_temp[this.index],
             minStep: 1
           });
	this.AirConditioner_WithSwing
         .getCharacteristic(Characteristic.SwingMode).onGet( this.get_swingmode.bind(this)).onSet(this.set_swingmode.bind(this));
    	return [infoService,this.AirConditioner_WithSwing];
    }
}