var Service, Characteristic;
const sent =  require("./setvalue.js");
var net = require('net');
var current_state = [];
var hdl_addr = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-hdl-pro-dimmer", "HDL_Pro-Dimmer", hdl_dimmer);
}

function hdl_dimmer(log, config)
{
   /* Mandatory Parameters */
   this.manager_ip = config["IP-Address-of-Manger-Hub"] || 'localhost';
   this.dimmer = config["Dimmer"];

   /* Logs */
   this.log = log;
}

hdl_dimmer.prototype.accessories = function(callback){
    var log = this.log;
	var results = [];
    var manager_ip = this.manager_ip;
	let client = new net.Socket();
    setTimeout(() => {
        client.connect(6001,  manager_ip, function() {
            log.info('HDL Pro Dimmer Device Connected to Feedback Manager Server');
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
	   log.error('Dimmer Platform Disconnected from Device Manager');
    });

    client.on('error', function(err) {
       log.error('Error from socket=',err)
	   setTimeout(() => client.connect({ port: 6001, host: manager_ip }), 5000);
    });


  for(var i=0;i<this.dimmer.length;i++){
	       current_state.push(false);
	       hdl_addr.push(this.dimmer[i]["HDL_Address"]);
		   results.push(new HDL_Dimmer(this.dimmer[i]["HDL_Address"], this.dimmer[i]["Name"], hdl_addr.indexOf(this.dimmer[i]["HDL_Address"]), this.log));
  }

 callback(results)
}


class HDL_Dimmer{
	constructor(HDL_addr, name, device_index, log){
	  this.HDL_addr = HDL_addr;
	  this.name =  name;
      this.device_index = device_index;
      this.log = log;
      this.HDL_Dimmer = new Service.Lightbulb(this.name);
      this.dimmer_trigger = true;
      this.last_brightness_value = 100;
	}

	set_On(stt){
      setTimeout(() => {
        if (this.dimmer_trigger) {
            this.log.info("Triggering the Dimmer state:", this.name ,"associated with HDL Address:", this.HDL_addr,"for changing state to:",Number(stt));
            if (stt && this.last_brightness_value !== 0){
                sent.set_data(this.HDL_addr, Number(stt));
            }
            else if (stt && this.last_brightness_value == 0){
                sent.set_data(this.HDL_addr, 100);
            }
            else if (!stt){
                sent.set_data(this.HDL_addr, 0);
            }
          }
      } ,350);
	}
    get_On(){
      this.log.info("Requesting current state for the Dimmer:", this.name ,"associated with HDL Address:", this.HDL_addr,"........received :",current_state[this.device_index]);
      if (Number(current_state[this.device_index]) >= 0 && Number(current_state[this.device_index]) <= 100){
            return Boolean(current_state[this.device_index]);
      }
      else {
            this.log.warn("Received invalid state for Dimmer:", current_state[this.device_index], "Returning default state:0");
            return false;
      }
   	}

    set_Brightness(stt){
        this.log.info("Triggering the Dimmer value:", this.name ,"associated with HDL Address:", this.HDL_addr,"for changing state to:",Number(stt));
        this.dimmer_trigger = false;
        sent.set_data(this.HDL_addr, Number(stt));
        if (Number(stt) > 0){
            this.last_brightness_value = Number(stt);
        }
        setTimeout(() => this.dimmer_trigger = true, 2000);
    }
    get_Brightness(){
        this.log.info("Requesting current value for the Dimmer:", this.name ,"associated with HDL Address:", this.HDL_addr,"........received :",current_state[this.device_index]);
        if (Number(current_state[this.device_index]) >= 0 && Number(current_state[this.device_index]) <= 100){
            return Number(current_state[this.device_index]);
        }
        else {
            this.log.warn("Received invalid value for Dimmer:", current_state[this.device_index], "Returning default value:0");
            return 0;
        }
    }

	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "HDL Pro Controls")
         .setCharacteristic(Characteristic.Model, "HDLPro-Dimmer")
         .setCharacteristic(Characteristic.SerialNumber, this.HDL_addr);
      this.HDL_Dimmer
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
      this.HDL_Dimmer
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_Brightness.bind(this)).onSet(this.set_Brightness.bind(this));

      return [infoService,this.HDL_Dimmer];
     }

     update_state(cs){
        if (cs >= 0 && cs <= 100){
            this.log.info("Valid feedback received and updated for Dimmer:", this.name, "associated with HDL address:", this.HDL_addr, "with current state:", cs/100);
            this.HDL_Dimmer.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
            if (!this.dimmer_trigger){
               setTimeout(() => this.HDL_Dimmer.getCharacteristic(Characteristic.Brightness).updateValue(Number(cs)), 2000) ;
               if (Number(cs) > 0){
                this.last_brightness_value = Number(cs);
               }
            }
        }
        else {
            this.log.warn("Invalid feedback received for the Dimmer:", this.name, "associated with HDL address:", this.HDL_addr, "with current state:", cs, ". Valid numbers are 0 or 100 only");
        }
    }
}