var Service, Characteristic;
const net = require('net');
let current_fan_state = [];
let current_fan_step = [];
let ID = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-crestron-fan", "crestron-fan", crestron);
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
var device = this.device;
// Create a new TCP client
let client = new net.Socket();

for (var i=0;i<this.device.length;i++) {
  ID.push(this.device[i]["ID"]);
  current_fan_state.push(100);
  current_fan_step.push(0);
}

setTimeout(() => connectToServer(host, port), 5000);
function connectToServer(host, port) {
client.connect(port, host, () => {
    log.info('Connected to server');
  //  client.write('event_subscribe');
    setTimeout(() => fb_fan(), 250);
});

// Handle incoming data from the server
client.on('data', (data) => {
    log.info('Data received from Crestron Client:', data.toString());
    data = data.toString();
    data = data.split(':');
    if (data[0] == 'Fan' && ID.indexOf(data[1]) !== -1 && data[2] == 'eventSpeedLevel' && results[ID.indexOf(data[1])] !== undefined) {
      results[ID.indexOf(data[1])].update_state(parseInt(data[3]));
      current_fan_state[ID.indexOf(data[1])] = Number(parseInt(data[3]));
    } else if (data[0] == 'Fan' && ID.indexOf(data[1]) !== -1 && data[2] == 'getFanMaxStep') {
      current_fan_step[ID.indexOf(data[1])] = parseInt(data[3]);
      if (current_fan_step.indexOf(0) == -1){
        launch_devices();
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


function fb_fan(){
  client.write('FanID:'+ID.toString());
}

async function fb_speed(){
  await delay (25000);
  for(var i=0;i<ID.length;i++){
  client.write('FB-Fan:'+ID[i]+':getSpeedLevel');
  await delay (100);
  }
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

function launch_devices(){
    for(var i=0;i<device.length;i++){
      let fan_step = current_fan_step[i];
      if (fan_step !== 0){
        log.info("Adding the Fan Accessory for Crestron:", device[i]["Name"]);
        results.push(new Crestron_Fan(device[i]["ID"], device[i]["Name"], write, fan_step, log));
      }
      else {
        log.warn('Valid fan step is not received for Fan ID:', ID[i]);
      }
    }
    //fb_speed();
    callback(results)
}

}


class Crestron_Fan {
	constructor(id, name, write, fan_step, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.fan_step = Math.round(100/fan_step);
    this.log = log;
  	this.Crestron_Fan = new Service.Fan(this.name);
    this.last_brightness = 100;
	}

	set_On(stt){
      this.log.info("Triggering the Crestron Fan:", this.name ,"for changing state to:",Number(stt));
      setTimeout(() => {
        if (stt == false) {
          let str  = 'Fan:'+this.id+':eventSpeedLevel:0';
          this.write(str);
        }
        else {
          let str  = 'Fan:'+this.id+':eventSpeedLevel:'+String(this.last_brightness);
          this.write(str);
        }
      } , 350)
	}
  get_On(){
      this.log.info("Requesting current state for the Crestron Fan:", this.name ,"........received :",current_fan_state[this.index]);
      return Boolean(current_fan_state[this.index]);
	}

  set_RotationSpeed(stt){
    stt = this.customMapping(stt);
    if (stt !== 0){
      this.last_brightness = stt;
    }
    let str  = 'Fan:'+this.id+':eventSpeedLevel:'+String(stt);
    this.write(str);
  }
  get_RotationSpeed(){
    this.log.info("Requesting current state for the Crestron Fan:", this.name ,"........received :",current_fan_state[this.index]);
    return this.customMapping(Number(current_fan_state[this.index]));
  }

  customMapping(number) {
      if (number === 66) {
          return 67;
      } else if (number === 99) {
          return 100;
      } else {
          return number;
      }
  }
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "Fan")
         .setCharacteristic(Characteristic.SerialNumber, "CESWT-"+this.id);
      this.Crestron_Fan
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
      this.Crestron_Fan
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.get_RotationSpeed.bind(this)).onSet(this.set_RotationSpeed.bind(this))
         .setProps({
          minValue: 0,
          maxValue: 100,
          minStep: this.fan_step
        });

      return [infoService,this.Crestron_Fan];
  }

  update_state(cs){
    this.log.info('Request to update the state of', this.name, 'to ->',cs);
		this.Crestron_Fan.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
    this.Crestron_Fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.customMapping(cs));
  }
}