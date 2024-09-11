var Service, Characteristic;
const net = require('net');
let current_dimmer_state = [];
let ID = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-crestron-dimmer", "crestron-dimmer", crestron);
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

setTimeout(() => connectToServer(host, port), 6500);
function connectToServer(host, port) {
// Connect to the server
client.connect(port, host, () => {
    log.info('Connected to server');
   // client.write('event_subscribe');
    setTimeout(() => fb_dim(), 250);
});

// Handle incoming data from the server
client.on('data', (data) => {
    log.info('Data received from Crestron Client:', data.toString());
    data = data.toString();
    data = data.split(':');
    if (data[0] == 'Lightbulb' && ID.indexOf(data[1]) !== -1) {
      results[ID.indexOf(data[1])].update_state(Number(parseInt(data[3])));
      current_dimmer_state[ID.indexOf(data[1])] = Number(parseInt(data[3]));
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


function fb_dim(){
  client.write('DimmerID:'+ID.toString());
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
            log.info("Adding the Dimmer Accessory for Crestron:", this.device[i]["Name"]);
            current_dimmer_state.push(100);
            ID.push(this.device[i]["ID"]);
            results.push(new Crestron_Dimmer(this.device[i]["ID"], this.device[i]["Name"], write, this.log));
	  }

 callback(results)
}


class Crestron_Dimmer {
	constructor(id, name, write, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.log = log;
  	this.Crestron_Dimmer = new Service.Lightbulb(this.name);
    this.last_brightness = 100;
	}

	set_On(stt){
      this.log.info("Triggering the Crestron Dimmer:", this.name ,"for changing state to:",Number(stt));
      setTimeout(() => {
        if (stt == false) {
          let str  = 'Lightbulb:'+this.id+':eventPowerLevel:0';
          this.write(str);
        }
        else {
          let str  = 'Lightbulb:'+this.id+':eventPowerLevel:'+String(this.last_brightness);
          this.write(str);
        }
      } , 350)
	}
  get_On(){
      this.log.info("Requesting current state for the Crestron Dimmer:", this.name ,"........received :",current_dimmer_state[this.index]);
      return Boolean(current_dimmer_state[this.index]);
	}

  set_Brightness(stt){
    if (stt !== 0){
      this.last_brightness = stt;
    }
    let str  = 'Lightbulb:'+this.id+':eventPowerLevel:'+String(stt);
    this.write(str);
  }
  get_Brightness(){
    this.log.info("Requesting current state for the Crestron Dimmer:", this.name ,"........received :",current_dimmer_state[this.index]);
    return Number(current_dimmer_state[this.index]);
  }

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "Dimmer")
         .setCharacteristic(Characteristic.SerialNumber, "CESWT-"+this.id);
      this.Crestron_Dimmer
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
      this.Crestron_Dimmer
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_Brightness.bind(this)).onSet(this.set_Brightness.bind(this));

      return [infoService,this.Crestron_Dimmer];
  }

  update_state(cs){
    this.log.info('Request to update the state of', this.name, 'to ->',cs);
		this.Crestron_Dimmer.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
    this.Crestron_Dimmer.getCharacteristic(Characteristic.Brightness).updateValue(cs);
  }
}