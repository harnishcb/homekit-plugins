var Service, Characteristic;
const net = require('net');
let current_keypad_state = [];
let ID = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-crestron-keypad", "crestron-keypad", crestron);
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
});

// Handle incoming data from the server
client.on('data', (data) => {
    log.info('Data received from Crestron Client:', data.toString());
    data = data.toString();
    data = data.split(':');
    if (data[0] == 'Keypad' && ID.indexOf(data[1]) !== -1) {
      results[ID.indexOf(data[1])].update_state(parseInt(data[3]));
      current_keypad_state[ID.indexOf(data[1])] = parseInt(data[3]);
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
            log.info("Adding the Keypad Accessory for Crestron:", this.device[i]["Name"]);
            current_keypad_state.push(false);
            ID.push(this.device[i]["ID"]);
            switch (Number(this.device[i]["Buttons"])) {
              case 1:
                results.push(new Crestron_Keypad_1(this.device[i]["ID"], this.device[i]["Name"], write, this.log));
              break;
              case 2:
                results.push(new Crestron_Keypad_2(this.device[i]["ID"], this.device[i]["Name"], write, this.log));
              break;
              case 4:
                results.push(new Crestron_Keypad_4(this.device[i]["ID"], this.device[i]["Name"], write, this.log));
              break;
            }
	  }

 callback(results)
}


class Crestron_Keypad_1 {
	constructor(id, name, write, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.log = log;
  	this.Crestron_Keypad_1 = new Service.StatelessProgrammableSwitch(this.name);
	}

  get_ProgrammableSwitchEvent() {
    this.log.info("Requesting current state for the Crestron Keypad:", this.name ,"........received :",current_keypad_state[this.index]);
    return current_keypad_state[this.index];
	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "Keypad")
         .setCharacteristic(Characteristic.SerialNumber, "CEKPD-"+this.id);
      this.Crestron_Keypad_1
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.get_ProgrammableSwitchEvent.bind(this))
         .setProps({
          validValues : [0]
          });

      return [infoService,this.Crestron_Keypad_1];
  }

  update_state(cs){
    this.log.info('Request to update the state of', this.name, 'to ->',cs);
		this.Crestron_Keypad_1.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
  }
}


class Crestron_Keypad_2 {
	constructor(id, name, write, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.log = log;
  	this.Crestron_Keypad_2 = new Service.StatelessProgrammableSwitch(this.name, 0);
  	this.Crestron_Keypad_21 = new Service.StatelessProgrammableSwitch(this.name+"1", 1);
	}

  get_ProgrammableSwitchEvent() {
    this.log.info("Requesting current state for the Crestron Keypad:", this.name ,"........received :",current_keypad_state[this.index]);
    return current_keypad_state[this.index];
	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "Keypad")
         .setCharacteristic(Characteristic.SerialNumber, "CEKPD-"+this.id);
      this.Crestron_Keypad_2
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.get_ProgrammableSwitchEvent.bind(this))
         .setProps({
          validValues : [0,2]
          });
	  this.Crestron_Keypad_21
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.get_ProgrammableSwitchEvent.bind(this))
         .setProps({
          validValues : [0,2]
          });

      return [infoService,this.Crestron_Keypad_2, this.Crestron_Keypad_21];
  }

  update_state(cs){
    this.log.info('Request to update the state of', this.name, 'to ->',cs);
    switch (cs[0]) {
      case "1":
        if (cs[1] == "S") {
          this.Crestron_Keypad_4.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
        } else {
          this.Crestron_Keypad_4.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
        }
      break;
      case "2":
        if (cs[1] == "S") {
          this.Crestron_Keypad_41.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
        } else {
          this.Crestron_Keypad_41.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
        }
      break;
      }
    }
}


class Crestron_Keypad_4 {
	constructor(id, name, write, log){
	  this.id = id;
	  this.name =  name;
    this.write = write;
    this.index = ID.indexOf(id);
    this.log = log;
  	this.Crestron_Keypad_4 = new Service.StatelessProgrammableSwitch(this.name, 0);
   	this.Crestron_Keypad_41 = new Service.StatelessProgrammableSwitch(this.name+"1", 1);
    this.Crestron_Keypad_42 = new Service.StatelessProgrammableSwitch(this.name+"2", 2);
    this.Crestron_Keypad_43 = new Service.StatelessProgrammableSwitch(this.name+"3", 3);
	}

  get_ProgrammableSwitchEvent() {
    this.log.info("Requesting current state for the Crestron Keypad:", this.name ,"........received :",current_keypad_state[this.index]);
    return current_keypad_state[this.index];
	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Crestron Electronics")
         .setCharacteristic(Characteristic.Model, "Keypad")
         .setCharacteristic(Characteristic.SerialNumber, "CEKPD-"+this.id);
      this.Crestron_Keypad_4
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.get_ProgrammableSwitchEvent.bind(this))
         .setProps({
          validValues : [0,2]
          });
	    this.Crestron_Keypad_41
         .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.get_ProgrammableSwitchEvent.bind(this))
         .setProps({
          validValues : [0,2]
          });
      this.Crestron_Keypad_42
          .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.get_ProgrammableSwitchEvent.bind(this))
          .setProps({
           validValues : [0,2]
           });
      this.Crestron_Keypad_43
          .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.get_ProgrammableSwitchEvent.bind(this))
          .setProps({
           validValues : [0,2]
           });

      return [infoService,this.Crestron_Keypad_4, this.Crestron_Keypad_41, this.Crestron_Keypad_42, this.Crestron_Keypad_43];
  }

  update_state(cs){
    this.log.info('Request to update the state of', this.name, 'to ->',cs);
    switch (cs[0]) {
      case "1":
        if (cs[1] == "S") {
          this.Crestron_Keypad_4.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
        } else {
          this.Crestron_Keypad_4.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
        }
      break;
      case "2":
        if (cs[1] == "S") {
          this.Crestron_Keypad_41.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
        } else {
          this.Crestron_Keypad_41.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
        }
      break;
      case "3":
        if (cs[1] == "S") {
          this.Crestron_Keypad_42.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
        } else {
          this.Crestron_Keypad_42.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
        }
      break;
      case "4":
        if (cs[1] == "S") {
          this.Crestron_Keypad_43.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
        } else {
          this.Crestron_Keypad_43.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(2);
        }
      break;
    }
  }
}