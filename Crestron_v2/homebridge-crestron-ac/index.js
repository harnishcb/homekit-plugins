var Service, Characteristic;
const net = require('net');
let current_ac_state = [];
let current_ac_temperature = [];
let temperature_range = [];
let ID = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-crestron-ac", "crestron-ac", crestron);
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

const host = 'localhost';
const port = 36600;

// Create a new TCP client
let client = new net.Socket();
setTimeout(() => connectToServer(host, port), 5500);

function connectToServer(host, port){
client.connect(port, host, () => {
  log.info('Connected to server');
  setTimeout(() => fb_ac(), 250);
});

client.on('data', (data) => {
    log.info('Data received from Crestron Client:', data.toString());
    data = data.toString();
    data = data.split(':');
    if (data[0] == 'AC' && ID.indexOf(data[1]) !== -1 && data[2] == 'eventPowerState' && results[ID.indexOf(data[1])] !== undefined) {
      results[ID.indexOf(data[1])].update_state(parseInt(data[3]));
      current_ac_state[ID.indexOf(data[1])] = parseInt(data[3]);
    } else if (data[0] == 'AC' && ID.indexOf(data[1]) !== -1 && data[2] == 'eventTemperature' && results[ID.indexOf(data[1])] !== undefined) {
      results[ID.indexOf(data[1])].update_state(parseInt(data[3]));
      current_ac_temperature[ID.indexOf(data[1])] = parseInt(data[3]);
    } else if (data[0] == 'AC' && ID.indexOf(data[1]) !== -1 && data[2] == 'eventTempRangeMin') {
      temperature_range[ID.indexOf(data[1])][0] = parseInt(data[3]);
    } else if (data[0] == 'AC' && ID.indexOf(data[1]) !== -1 && data[2] == 'eventTempRangeMax') {
      temperature_range[ID.indexOf(data[1])][1] = parseInt(data[3]);
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

function fb_ac(){
    client.write('ACID:'+ID.toString());
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
for (var i=0;i<this.device.length;i++){
  current_ac_state.push(false);
  current_ac_temperature.push(18);
  temperature_range.push([16,32]);
  ID.push(this.device[i]["ID"]);
}


setTimeout(() =>  {
 for (var i=0;i<this.device.length;i++){
  log.info("Adding the AC Accessory for Crestron:", this.device[i]["Name"]);
  results.push(new Crestron_AC(this.device[i]["ID"], this.device[i]["Name"], write, this.log));
}
callback(results)
}, 6000);

}


class Crestron_AC {
	constructor(id, name, write, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.log = log;
  	this.Crestron_AC = new Service.HeaterCooler(this.name);
	}

	set_Active(stt){
    this.log.info("Triggering the Crestron AC:", this.name ,"for changing state to:",Number(stt));
    current_ac_state[this.index] = stt;
    let str  = 'AC:'+this.id+':eventPowerState:'+String(stt);
    this.write(str);
	}
  get_Active(){
    this.log.info("Requesting current state for the AC:", this.name ,"........received :",current_ac_state[this.index]);
    return Boolean(current_ac_state[this.index]);
	}

  get_CurrentHeaterCoolerState(){
    return current_ac_state[this.index];
  }

  set_TargetHeaterCoolerState(stt){
    this.log.info("Triggering the Crestron AC:", this.name ,"for changing mode to:",Number(stt));
    current_ac_state[this.index] = stt;
    let str  = 'AC:'+this.id+':eventPowerState:'+String(stt);
    this.write(str);
  }
  get_TargetHeaterCoolerState(){
    return current_ac_state[this.index];
  }

  get_CurrentTemperature(){
    return current_ac_temperature[this.index];
  }

  set_CoolingThresholdTemperature(stt){
    let str  = 'AC:'+this.id+':eventTemperature:'+String(Number(stt));
    this.write(str);
  }
  get_CoolingThresholdTemperature(){
    return current_ac_temperature[this.index];
  }

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "Air-Conditioner")
         .setCharacteristic(Characteristic.SerialNumber, "CEAC-"+this.id);
      this.Crestron_AC
         .getCharacteristic(Characteristic.Active).onGet(this.get_Active.bind(this)).onSet(this.set_Active.bind(this));
      this.Crestron_AC
         .getCharacteristic(Characteristic.CurrentHeaterCoolerState).onGet(this.get_CurrentHeaterCoolerState.bind(this));
      this.Crestron_AC
         .getCharacteristic(Characteristic.TargetHeaterCoolerState).onGet(this.get_TargetHeaterCoolerState.bind(this)).onSet(this.set_TargetHeaterCoolerState.bind(this))
         .setProps({
          validValues : [2]
         });
      this.Crestron_AC
         .getCharacteristic(Characteristic.CurrentTemperature).onGet(this.get_CurrentTemperature.bind(this))
         .setProps({
          minValue: temperature_range[this.index][0],
          maxValue: temperature_range[this.index][1],
          minStep: 1
        });
      this.Crestron_AC
         .getCharacteristic(Characteristic.CoolingThresholdTemperature).onGet(this.get_CoolingThresholdTemperature.bind(this)).onSet(this.set_CoolingThresholdTemperature.bind(this))
         .setProps({
          minValue: temperature_range[this.index][0],
          maxValue: temperature_range[this.index][1],
          minStep: 1
        });

      return [infoService,this.Crestron_AC];
  }

  update_state(cs){
    this.log.info('Request to update the state of', this.name, 'to ->',cs);
    if (cs == 0 || cs == 1){
      this.Crestron_AC.getCharacteristic(Characteristic.Active).updateValue(cs);
    } else if (cs > 14 && cs < 35) {
      this.Crestron_AC.getCharacteristic(Characteristic.CurrentTemperature).updateValue(cs);
      this.Crestron_AC.getCharacteristic(Characteristic.CoolingThresholdTemperature).updateValue(cs);
    }
  }
}