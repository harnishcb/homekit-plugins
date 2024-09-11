var Service, Characteristic;
const sent =  require("./setvalue.js");
var net = require('net');
var current_state = [];
var hdl_addr = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-hdl-pro-switch", "HDL_Pro-Switch", hdl_switch);
}

function hdl_switch(log, config)
{
   /* Mandatory Parameters */
   this.serial = config["Serial-No."];
   this.manager_ip = config["IP-Address-of-Manger-Hub"] || 'localhost';
   this.switch = config["Switch"];

   /* Logs */
   this.log = log;
}

hdl_switch.prototype.accessories = function(callback){
    var log = this.log;
	var results = [];
    var manager_ip = this.manager_ip;
	let client = new net.Socket();
    setTimeout(() => {
        client.connect(6001,  manager_ip, function() {
            log.info('HDL Pro Switch Device Connected to Feedback Manager Server');
        });
    }, 10000)


    client.on('data', function(data) {
    try {
     data = JSON.parse(data);
     var temp_hdl_addr = data.device_addr;
     var temp_value = data.value;
     var find_addr = hdl_addr.indexOf(temp_hdl_addr);
     if (find_addr !== -1){
       results[find_addr].update_state(parseInt(temp_value));
     }
	}
	catch(err){
      log.error("Error while parsing the message:", err);
 	}
    });

    client.on('close', function() {
	  log.error('Switch Platform Disconnected from Device Manager');
    });

    client.on('error', function(err) {
       log.error('Error from socket=',err)
	   setTimeout(() => client.connect({ port: 6001, host: manager_ip }), 5000);
    });


  for(var i=0;i<this.switch.length;i++){
	       current_state.push(false);
	       hdl_addr.push(this.switch[i]["HDL_Address"]);
		   results.push(new HDL_Switch(this.switch[i]["HDL_Address"], this.switch[i]["Name"], hdl_addr.indexOf(this.switch[i]["HDL_Address"]), this.log));
  }

 callback(results)
}


class HDL_Switch{
	constructor(HDL_addr, name, device_index, log){
	this.HDL_addr = HDL_addr;
	this.name =  name;
    this.device_index = device_index;
    this.log = log;
	this.HDL_Switch = new Service.Switch(this.name);
	}

	set_On(stt){
      this.log.info("Triggering the Switch:", this.name ,"associated with HDL Address:", this.HDL_addr,"for changing state to:",Number(stt));
	  sent.set_data(this.HDL_addr, Number(stt));
	}
    get_On(){
      this.log.info("Requesting current state for the Switch:", this.name ,"associated with HDL Address:", this.HDL_addr,"........received :",current_state[this.device_index]);
      return Boolean(current_state[this.device_index]);
   	}

	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "HDL Pro Controls")
         .setCharacteristic(Characteristic.Model, "HDLPro-Switch")
         .setCharacteristic(Characteristic.SerialNumber, this.HDL_addr);
      this.HDL_Switch
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));

      return [infoService,this.HDL_Switch];
     }

	update_state(cs){
        if (cs == 0 || cs == 100){
            this.log.info("Valid feedback received and updated for Switch:", this.name, "associated with HDL address:", this.HDL_addr, "with current state:", cs/100);
            this.HDL_Switch.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
        }
        else {
            this.log.warn("Invalid feedback received for the Switch:", this.name, "associated with HDL address:", this.HDL_addr, "with current state:", cs, ". Valid numbers are 0 or 100 only");
        }
    }
}