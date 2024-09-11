var Service, Characteristic;
const net = require('net');
let current_dimmer_state = [];
let current_cct_state = [];
let ID = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-crestron-cct", "crestron-cct", crestron);
}

function crestron(log, config)
{
   this.port = config["Server_Port_no"];
   this.device = config["device"];
   this.log = log;
}

crestron.prototype.accessories = function(callback){

var log = this.log;
var results = [];


const host = 'localhost'; // Change this to the appropriate server host
const port = 36600; // Change this to the appropriate server port

// Create a new TCP client
let client = new net.Socket();

setTimeout(() => connectToServer(host, port), 7000);

function connectToServer(host, port){
  client.connect(port, host, () => {
    log.info('Connected to server');
   // client.write('event_subscribe');
    setTimeout(() => fb_cct(), 250);
});

// Handle incoming data from the server

client.on('data', (data) => {
    log.info('Data received from Crestron Client:', data.toString());
    data = data.toString();
    data = data.split(':');
    if (data[0] == 'LightCCT' && ID.indexOf(data[1]) !== -1) {
      results[ID.indexOf(data[1])].update_state(parseInt(data[3]));
      if (parseInt(data[3]) <= 100){
        current_dimmer_state[ID.indexOf(data[1])] = (parseInt(data[3]));
      }
      else {
        current_cct_state[ID.indexOf(data[1])] = (parseInt(data[3]));
      }
    }
});

// Handle connection close
client.on('close', () => {
    log.warn('Connection closed');
    reconnect();
});

client.on('error', (err) => {
  log.error('Connection error', err);
});

}

function fb_cct(){
      client.write('CCTID:'+ID.toString());
}

function write(data){
  client.write(data+'\r');
}

function reconnect() {
  log.info('Reconnecting...');
  setTimeout(() => {
      client.removeAllListeners(); // Remove previous event listeners
      client = new net.Socket(); // Create a new instance of the client
      connectToServer(host, port); // Attempt to reconnect
  }, 3000); // Adjust the timeout as needed
}
//-------------------------------------------------------------------------//
    for(var i=0;i<this.device.length;i++){
            log.info("Adding the CCT Accessory for Crestron:", this.device[i]["Name"]);
            current_dimmer_state.push(100);
            current_cct_state.push(2700);
            ID.push(this.device[i]["ID"]);
            results.push(new Crestron_CCT(this.device[i]["ID"], this.device[i]["Name"], write, this.log));
	  }

 callback(results)
}


class Crestron_CCT {
	constructor(id, name, write, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.log = log;
  	this.Crestron_CCT = new Service.Lightbulb(this.name);
    this.last_brightness = 100;
	}

	set_On(stt){
      this.log.info("Triggering the Crestron CCT:", this.name ,"for changing state to:",Number(stt));
      setTimeout(() => {
        if (stt == false) {
          let str  = 'LightCCT:'+this.id+':eventPowerLevel:0';
          this.write(str);
        }
        else {
          let str  = 'LightCCT:'+this.id+':eventPowerLevel:'+String(this.last_brightness);
          this.write(str);
        }
      } , 350)
	}
  get_On(){
      this.log.info("Requesting current state for the Crestron CCT:", this.name ,"........received :",current_dimmer_state[this.index]);
      return Boolean(current_dimmer_state[this.index]);
	}

  set_Brightness(stt){
    if (stt !== 0){
      this.last_brightness = stt;
    }
    let str  = 'LightCCT:'+this.id+':eventPowerLevel:'+String(stt);
    this.write(str);
  }
  get_Brightness(){
    this.log.info("Requesting current state for the Crestron CCT:", this.name ,"........received :",current_dimmer_state[this.index]);
    return Number(current_dimmer_state[this.index]);
  }

  set_ColorTemperature(stt){
    let str  = 'LightCCT:'+this.id+':eventColortemperature:'+String(Math.round(1000000/stt));
    this.write(str);
  }
  get_ColorTemperature(){
    return Math.round(1000000/Number(current_cct_state[this.index]));
  }

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "CCT")
         .setCharacteristic(Characteristic.SerialNumber, "CESWT-"+this.id);
      this.Crestron_CCT
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
      this.Crestron_CCT
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_Brightness.bind(this)).onSet(this.set_Brightness.bind(this));
      this.Crestron_CCT
         .getCharacteristic(Characteristic.ColorTemperature).onGet(this.get_ColorTemperature.bind(this)).onSet(this.set_ColorTemperature.bind(this))
         .setProps({
          minValue: 143,
          maxValue: 370,
          minStep: 1
        });

      return [infoService,this.Crestron_CCT];
  }

  update_state(cs){
    if (cs <= 100){
      this.log.info('Request to update the state of', this.name, 'to ->',cs);
      this.Crestron_CCT.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
      this.Crestron_CCT.getCharacteristic(Characteristic.Brightness).updateValue(cs);
    }
    else if (cs > 100 && cs <= 7000) {
      this.Crestron_CCT.getCharacteristic(Characteristic.ColorTemperature).updateValue(Math.round(1000000/cs));
    }
  }
}