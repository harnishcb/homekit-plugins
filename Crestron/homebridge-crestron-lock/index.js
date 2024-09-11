var Service, Characteristic;
const net = require('net');
let current_lock_state = [];
let ID = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-crestron-lock", "crestron-lock", crestron);
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
    setTimeout(() => fb_lock(), 250);
});

// Handle incoming data from the server
client.on('data', (data) => {
    log.info('Data received from Crestron Client:', data.toString());
    data = data.toString();
    data = data.split(':');
    if (data[0] == 'Lock' && ID.indexOf(data[1]) !== -1) {
      results[ID.indexOf(data[1])].update_state(parseInt(data[3]));
      current_lock_state[ID.indexOf(data[1])] = parseInt(data[3]);
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

function fb_lock(){
 client.write('LockID:'+ID.toString());
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
            log.info("Adding the Lock Accessory for Crestron:", this.device[i]["Name"]);
            current_lock_state.push(false);
            ID.push(this.device[i]["ID"]);
            results.push(new Crestron_Lock(this.device[i]["ID"], this.device[i]["Name"], write, this.log));
	  }

 callback(results)
}



class Crestron_Lock {
	constructor(id, name, write, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.log = log;
  	this.Crestron_Lock = new Service.LockMechanism(this.name);
	}

	set_LockTargetState(stt){
    stt = 1- stt;
    this.log.info("Triggering the Crestron Lock:", this.name ,"for changing state to:",Number(stt));
    current_lock_state[this.index] = stt;
    let str  = 'Lock:'+this.id+':eventLock:'+String(Number(stt));
    this.write(str);
	}
  get_LockTargetState(){
    this.log.info("Requesting current state for the Crestron Lock:", this.name ,"........received :",current_lock_state[this.index]);
    return 1-current_lock_state[this.index];
  }

  get_LockCurrentState(){
    this.log.info("Requesting current state for the Crestron Lock:", this.name ,"........received :",current_lock_state[this.index]);
    return 1-current_lock_state[this.index];
  }

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "Lock")
         .setCharacteristic(Characteristic.SerialNumber, "CESWT-"+this.id);
      this.Crestron_Lock
      .getCharacteristic(Characteristic.LockCurrentState).onGet(this.get_LockCurrentState.bind(this))
      .setProps({
        validValues : [0,1]
      });
      this.Crestron_Lock
      .getCharacteristic(Characteristic.LockTargetState).onGet(this.get_LockTargetState.bind(this)).onSet(this.set_LockTargetState.bind(this));
      return [infoService,this.Crestron_Lock];
  }

  update_state(cs){
    this.log.info('Request to update the state of', this.name, 'to ->',cs);
		this.Crestron_Lock.getCharacteristic(Characteristic.LockTargetState).updateValue(1-cs);
		this.Crestron_Lock.getCharacteristic(Characteristic.LockCurrentState).updateValue(1-cs);
  }
}