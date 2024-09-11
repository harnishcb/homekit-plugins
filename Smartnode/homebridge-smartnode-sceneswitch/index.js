var Service, Characteristic;
var net = require('net');

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-smartnode-sceneswitch", "Smartnode_Device-Scenepanel", sn);
}
  
function sn(log, config) 
{
  this.log = log;
  this.serial = config["Serial-No."];
  this.ip = config["IP-Address"]; 
  this.name = config["Panel-Name"];
}

sn.prototype.accessories = function(callback){

var results = [];
let client = new net.Socket();
var retrying = false;
var ip = this.ip;

function makeConnection () {
	console.log('Connected to Scene-Panel', ip);
    client.connect(13002, ip);
}
function connectEventHandler() {
    console.log('connected to Scene-Panel'+ ip);
    retrying = false;
}
function endEventHandler() {
    console.log('end');
}
function timeoutEventHandler() {
   console.log('timeout');
}
function drainEventHandler() {
     console.log('drain');
}
function errorEventHandler() {
    console.log('error',ip);
}
function closeEventHandler () {
    if (!retrying) {
        retrying = true;
        console.log('Reconnecting...');
    }
}

client.on('connect', connectEventHandler);
client.on('data', function(data) {
	try {
	data = JSON.parse(data);
    console.log(JSON.stringify(data));
	if(data.cmd == "SCL"){
	 console.log('Received: '+'cmd_type=SCL, Node='+data.node+' Value='+data.val+' ip='+ip);		
     if(data.val == 1){
		results[0].updatevalue(data.node); 
	 }    	
	}
	}catch(err){
	//	console.log(err);
	}
 });
client.on('end',     endEventHandler);
client.on('timeout', timeoutEventHandler);
client.on('drain',   drainEventHandler);
client.on('error',   errorEventHandler);
client.on('close',   makeConnection);
console.log('Connecting to ' + this.ip + ':' + '13002' + '...');
makeConnection();

results.push(new SNSCENEPANEL(this.serial,this.name));
callback(results)
}    

class SNSCENEPANEL{
	constructor(serial, name){
    this.serial = serial;
	this.name =  "SN-Scene-"+String(name);
    this.SNSCENEPANEL = new Service.StatelessProgrammableSwitch(this.name,this.name);
    this.SNSCENEPANELX2 = new Service.StatelessProgrammableSwitch(this.name+"2",this.name+"2");
    this.SNSCENEPANELX3 = new Service.StatelessProgrammableSwitch(this.name+"3",this.name+"3");
    this.SNSCENEPANELX4 = new Service.StatelessProgrammableSwitch(this.name+"4",this.name+"4");
	}	

	GetProgrammableSwitchEvent(){
	   return 0;	
	}		
	GetProgrammableSwitchEventX2(){
	   return 0;	
	}		
	GetProgrammableSwitchEventX3(){
	   return 0;	
	}	
	GetProgrammableSwitchEventX4(){
	   return 0;	
	}
	
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Smartnode Automations")
         .setCharacteristic(Characteristic.Model, "SN-ScenePanel")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
     this.SNSCENEPANEL
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.GetProgrammableSwitchEvent.bind(this))
		 .setProps({ validValues: [0,2] });	
	 this.SNSCENEPANEL
	    .getCharacteristic(Characteristic.ServiceLabelIndex).setValue(1);

	 this.SNSCENEPANELX2
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.GetProgrammableSwitchEventX2.bind(this))
		 .setProps({ validValues: [0,2] });	
	 this.SNSCENEPANELX2
	    .getCharacteristic(Characteristic.ServiceLabelIndex).setValue(2);

     this.SNSCENEPANELX3
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.GetProgrammableSwitchEventX3.bind(this))
		 .setProps({ validValues: [0,2] });	
	 this.SNSCENEPANELX3
	    .getCharacteristic(Characteristic.ServiceLabelIndex).setValue(3);
 
     this.SNSCENEPANELX4
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.GetProgrammableSwitchEventX4.bind(this))
		 .setProps({ validValues: [0,2] });	
	 this.SNSCENEPANELX4
	    .getCharacteristic(Characteristic.ServiceLabelIndex).setValue(4);
		
	 return [infoService,this.SNSCENEPANEL,this.SNSCENEPANELX2,this.SNSCENEPANELX3,this.SNSCENEPANELX4];
    }
	
	updatevalue(node){		
   	 switch(node){	
	  case 1:
	    this.SNSCENEPANEL.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
      break;	  
	  case 2:
	    this.SNSCENEPANELX2.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
      break;	  
	  case 3:
	    this.SNSCENEPANELX3.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
      break;	  
	  case 4:
	    this.SNSCENEPANELX4.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
      break;
	  case 5:
	    this.SNSCENEPANEL.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
      break;	  
	  case 6:
	    this.SNSCENEPANELX2.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
      break;	  
	  case 7:
	    this.SNSCENEPANELX3.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
      break;	  
	  case 8:
	    this.SNSCENEPANELX4.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
      break;
	}
}
}