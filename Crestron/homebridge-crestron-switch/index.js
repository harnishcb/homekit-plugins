var Service, Characteristic;
const net = require('net');
let current_switch_state = [];
let ID = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-crestron-switch", "crestron-switch", crestron);
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

setTimeout(() => connectToServer(host, port), 6000);
function connectToServer(host, port) {
// Connect to the server
client.connect(port, host, () => {
    log.info('Connected to server');
  //  client.write('event_subscribe');
    setTimeout(() => fb_switch(), 250);
});

// Handle incoming data from the server
client.on('data', (data) => {
    log.info('Data received from Crestron Client:', data.toString());
    data = data.toString();
    data = data.split(':');
    if (data[0] == 'Switch' && ID.indexOf(data[1]) !== -1) {
      results[ID.indexOf(data[1])].update_state(Boolean(parseInt(data[3])));
      current_switch_state[ID.indexOf(data[1])] = Boolean(parseInt(data[3]));
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

function write(data){
  client.write(data+'\r');
}

function fb_switch(){
 client.write('SwitchID:'+ID.toString());
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
            log.info("Adding the Switch Accessory for Crestron:", this.device[i]["Name"]);
            current_switch_state.push(false);
            ID.push(this.device[i]["ID"]);
            results.push(new Crestron_Switch(this.device[i]["ID"], this.device[i]["Name"], write, this.log));
	  }

 callback(results)
}


class Crestron_Switch {
	constructor(id, name, write, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.log = log;
  	this.Crestron_Switch = new Service.Switch(this.name);
	}

	set_On(stt){
    this.log.info("Triggering the Crestron Switch:", this.name ,"for changing state to:",Number(stt));
    current_switch_state[this.index] = stt;
    let str  = 'Switch:'+this.id+':eventPowerState:'+String(Number(stt));
    this.write(str);
	}
  get_On(){
      this.log.info("Requesting current state for the AV Switch:", this.name ,"........received :",current_switch_state[this.index]);
      return Boolean(current_switch_state[this.index]);
	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "Switch")
         .setCharacteristic(Characteristic.SerialNumber, "CESWT-"+this.id);
      this.Crestron_Switch
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));

      return [infoService,this.Crestron_Switch];
  }

  update_state(cs){
    this.log.info('Request to update the state of', this.name, 'to ->',cs);
		this.Crestron_Switch.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
  }
}