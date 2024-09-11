var Service, Characteristic;
const net = require('net');
let current_position = [];
let ID = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-crestron-curtain", "crestron-curtain", crestron);
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

setTimeout(() => connectToServer(host, port), 7500);
function connectToServer(host, port) {
client.connect(port, host, () => {
    log.info('Connected to server');
    //client.write('event_subscribe');
    setTimeout(() => fb_curtain(), 250);

});

// Handle incoming data from the server
client.on('data', (data) => {
    log.info('Data received from Crestron Client:', data.toString());
    data = data.toString();
    data = data.split(':');
    if (data[0] == 'Curtain' && ID.indexOf(data[1]) !== -1) {
      results[ID.indexOf(data[1])].update_state(Number(parseInt(data[3])));
      current_position[ID.indexOf(data[1])] = Number(parseInt(data[3]));
    }
});

client.on('close', () => {
    log.warn('Connection closed');
    reconnect();
});

client.on('error', (err) => {
  log.error('Connection error', err);
});

}

function fb_curtain(){
  client.write('CurtainID:'+ID.toString());
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
            log.info("Adding the Curtain Accessory for Crestron:", this.device[i]["Name"]);
            current_position.push(100);
            ID.push(this.device[i]["ID"]);
            results.push(new Crestron_Curtain(this.device[i]["ID"], this.device[i]["Name"], write, this.log));
	  }

 callback(results)
}


class Crestron_Curtain {
	constructor(id, name, write, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.log = log;
  	this.Crestron_Curtain = new Service.WindowCovering(this.name);
	}

	set_TargetPosition(stt){
    this.log.info("Triggering the Crestron Curtain:", this.name ,"for changing state to:",Number(stt));
    let str  = 'Curtain:'+this.id+':eventTargetState:'+String(stt);
    this.write(str);
	}
  get_TargetPosition(){
    this.log.info("Requesting target position for the Crestron Curtain:", this.name ,"........received :",current_position[this.index]);
    return current_position[this.index];
	}

  get_CurrentPosition(){
    this.log.info("Requesting current position for the Crestron Curtain:", this.name ,"........received :",current_position[this.index]);
    return current_position[this.index]
  }

  get_PositionState(){
    this.log.info("Requesting position state for the Crestron Curtain:", this.name ,"........received :",current_position[this.index]);
    return 2;
  }

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "Curtain")
         .setCharacteristic(Characteristic.SerialNumber, "CESWT-"+this.id);
      this.Crestron_Curtain
         .getCharacteristic(Characteristic.TargetPosition).onGet(this.get_TargetPosition.bind(this)).onSet(this.set_TargetPosition.bind(this))
         .setProps({
          minValue: 0,
          maxValue: 100,
          minStep: 100
        });
      this.Crestron_Curtain
         .getCharacteristic(Characteristic.CurrentPosition).onGet(this.get_CurrentPosition.bind(this))
         .setProps({
          minValue: 0,
          maxValue: 100,
          minStep: 100
        });
      this.Crestron_Curtain
         .getCharacteristic(Characteristic.PositionState).onGet(this.get_PositionState.bind(this));

      return [infoService,this.Crestron_Curtain];
  }

  update_state(cs){
    this.log.info('Request to update the state of', this.name, 'to ->',cs);
		this.Crestron_Curtain.getCharacteristic(Characteristic.TargetPosition).updateValue(Number(cs));
    this.Crestron_Curtain.getCharacteristic(Characteristic.CurrentPosition).updateValue(Number(cs));
  }
}