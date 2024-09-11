var Service, Characteristic;
var net = require('net');
var current_switch_state = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-globalcache-av_system", "GC-AV", gc_av);
}

function gc_av(log, config)
{
   this.ip = config["IP-Address"];
   this.device = config["device"];
   this.log = log;
}

gc_av.prototype.accessories = function(callback){

  var log = this.log;
	var results = [];
  var gc_ip_addr = this.ip;
	let client = new net.Socket();

    if (gc_ip_addr !== "undefined" && Boolean(Number(net.isIP(gc_ip_addr)))){

    log.info("AV Accessory connecting to Global Cache device at IP-Address:",gc_ip_addr);
    client.connect(4998, gc_ip_addr, function() {
            log.info('AV Accessory connecting to Global Cache device at IP-Address:',gc_ip_addr);
    });
    client.on('data', function(data) {
     data = data.toString();
     if(data.indexOf("completeir") !== -1){
        log.info("Data received from Global Cache: ", data);
     }
     else {
        log.error("Data received from Global Cache: ", data);
     }
    });

    client.on('close', function() {
	   log.error('AV Accessory disconnected from Global Cache device at IP-Address:',gc_ip_addr);
     setTimeout(() => {
       log.info("AV Accessory connecting to Global Cache device at IP-Address:",gc_ip_addr);
       client.connect({ port: 4998, host: gc_ip_addr });
       }, 5000);
    });

    client.on('error', function(err) {
       log.error('AV Accessory socket error:',err);
    });


  for(var i=0;i<this.device.length;i++){
           if (this.device[i]["Device-Type"]) {
            log.info("Adding the Switch Accessory:", this.device[i]["Name"]);
            current_switch_state.push(false);
            results.push(new GC_Switch(this.device[i]["On Code"], this.device[i]["Off Code"], this.device[i]["Name"], client, current_switch_state.length-1, this.log));
           }
	    }

  }
  else {
    log.error("The following IP Address entered is undefined or invalid:", gc_ip_addr);
  }

 callback(results)
}


class GC_Switch{
	constructor(on_code, off_code, name, client,index,log){
	  this.on_code = on_code;
    this.off_code = off_code;
	  this.name =  name;
    this.client = client;
    this.index = index;
    this.log = log;
  	this.GC_Switch = new Service.Switch(this.name);
	}

	set_On(stt){
      this.log.info("Triggering the AV Switch:", this.name ,"for changing state to:",Number(stt));
      current_switch_state[this.index] = stt;
      if(Boolean(Number(stt))){
        this.client.write(this.on_code+"\r");
      }
      else {
        this.client.write(this.off_code+"\r");
      }
	}
    get_On(){
      this.log.info("Requesting current state for the AV Switch:", this.name ,"........received :",current_switch_state[this.index]);
      return Boolean(current_switch_state[this.index]);
   	}

	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Globalcache")
         .setCharacteristic(Characteristic.Model, "IP2IR")
         .setCharacteristic(Characteristic.SerialNumber, "GCIP2IR");
      this.GC_Switch
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));

      return [infoService,this.GC_Switch];
     }
}