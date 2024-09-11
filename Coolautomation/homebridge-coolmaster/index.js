var Service, Characteristic;
const Net = require("net");

//**     Array to store current status of VRV / VRF Indoor Unit   **///
var ac_swt =[];
var ac_temp = [];
var ac_fan = [];
var ac_current_temp =[];
var map = [];
var Line_InUse = []

//**     Array to store current status of thermostat   **///
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-coolmaster", "Coolautomation", coolmaster);
}

function coolmaster(log, config)
{
  this.log = log;
  this.ip = config["IP-Address"];
  this.outdoor = config["outdoor"];
}
coolmaster.prototype.accessories = function(callback){
    var results = [];
	this.client = new Net.Socket();

  this.client.connect(10102,this.ip);
  this.client.on('data', function(rec){
    rec = rec.toString();

	var f_s = ['Low','Med','High','Top'];
	const lines = rec.toString().split('\n');
    lines.forEach(line => {
        console.log('Line:', line);
	if(line[0] == "L" && map.indexOf(line.slice(0,6).replace(/ /g, "")) != -1) {
		let ind = map.indexOf(line.slice(0,6).replace(/ /g, ""));
		try {
			ac_swt[ind] = Math.abs(line.slice(7,10).indexOf("OFF"));
			results[ind].handleResponse(Math.abs(line.slice(7,10).indexOf("OFF")), parseInt(line.slice(11,13)), 25*(1 + f_s.indexOf(line.slice(19,23).replace(/ /g, ""))), parseInt(line.slice(15,17)));
		}
		catch(e){
			console.log(e);
		}
	}
    });

    });

	this.client.on('close', function(){
      console.log("Connection Closed");
	  this.client.connect(10102,this.ip);
	});

	this.client.on('error', function(err){
		console.log("Error:",err);
	});


	for(var i=0;i<this.outdoor.length;i++){
		for(var j=0;j<this.outdoor[i].indoor.length ;j++){
			map.push(this.outdoor[i].Line+'.'+String(this.outdoor[i].indoor[j]["Indoor-Address"]));
        	results.push(new cooler(this.outdoor[i].Line,this.outdoor[i].indoor[j]["Indoor-Address"],this.outdoor[i].indoor[j]["Minimum_Temperature"],this.outdoor[i].indoor[j]["Maximum_Temperature"],Number(this.outdoor[i].indoor[j]["Heat_Mode"] == "Yes"),this.outdoor[i].indoor[j]["Name"],this.client));
		    ac_swt.push(0);
		    ac_temp.push(24);
		    ac_fan.push(0);
			ac_current_temp.push(24);
		}
		Line_InUse.push(this.outdoor[i].Line);
	}

	for(var i=0;i<Line_InUse.length;i++){
		fetch_feeback(i,this.client);
	}

	function fetch_feeback(i,client){
		setInterval(() => client.write("ls "+Line_InUse[i]+"\r\n"), 3000);          // Interval defines the polling interval to fetch the feedback
	}

	callback(results);   /// Callback to publish accessories
}


class cooler{
	constructor(main,indoor,min,max,heat,name,client){
	  this.main = main;
	  this.indoor = String(indoor);
	  this.min_temp = min;
	  this.max_temp = max;
	  this.heat_mode = heat;
	  this.name = name+' '+this.indoor;
	  this.client = client;
	  this.i = map.indexOf(main+"."+indoor);
	  this.cooler = new Service.HeaterCooler(this.name);
	}

	//**       Trigger and feedback function related to each property of the Accessories //
	setcooleractive(stt){
    	var temp = ["off","on"];
        this.client.write(temp[stt]+' '+this.main+"."+this.indoor+"\r\n");
	}
	getcooleractive(){
	 return ac_swt[this.i];
	}
	setcoolerthcs(stt){
		var temp = ["auto","heat", "cool"];
        this.client.write(temp[stt]+' '+this.main+"."+this.indoor+"\r\n");
  	}
	getcoolerthcs(){
	  return 2;
	}
	setcoolerrs(stt){
	   var fanspeed = ["l","m","h","t"];
	   this.client.write('fspeed'+' '+this.main+'.'+this.indoor+' '+fanspeed[(stt/25)-1]+'\r\n');
	}
	getcoolerrs(){
	 return ac_fan[this.i];
	}
	getcoolerchcs(){
    return ac_swt[this.i]*3;
	}
	getcoolerct(){
    return ac_current_temp[this.i];
	}
	setcoolerctt(stt){
	    this.client.write('temp'+' '+this.main+'.'+this.indoor+' '+String(stt)+'\r\n');
	}
	getcoolerctt(){
	 return ac_temp[this.i];
	}

	setcoolerht(stt){
	    this.client.write('temp'+' '+this.main+'.'+this.indoor+' '+String(stt)+'\r\n');
	}
	getcoolerht(){
	 return ac_temp[this.i];
	}
	 getServices(){
    var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Coolautomation")
         .setCharacteristic(Characteristic.Model, "Coolmaster")
         .setCharacteristic(Characteristic.SerialNumber, "CBTAC0015943153");
    this.cooler
         .getCharacteristic(Characteristic.Active).onGet(this.getcooleractive.bind(this)).onSet(this.setcooleractive.bind(this)); 
	this.cooler
         .getCharacteristic(Characteristic.CurrentHeaterCoolerState).onGet(this.getcoolerchcs.bind(this))
    this.cooler
         .getCharacteristic(Characteristic.TargetHeaterCoolerState).onGet(this.getcoolerthcs.bind(this)).onSet(this.setcoolerthcs.bind(this)) 
         .setProps({
             minValue: 2-(2*this.heat_mode),
             maxValue: 2,
             minStep: 1
           });
   this.cooler
         .getCharacteristic(Characteristic.CurrentTemperature).onGet(this.getcoolerct.bind(this));
	this.cooler
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.getcoolerrs.bind(this)).onSet(this.setcoolerrs.bind(this))
	     .setProps({
             minValue: 0,
             maxValue: 100,
             minStep: 25
           });
	this.cooler
         .getCharacteristic(Characteristic.CoolingThresholdTemperature).onGet(this.getcoolerctt.bind(this)).onSet(this.setcoolerctt.bind(this))
	     .setProps({
             minValue: this.min_temp,
             maxValue: this.max_temp,
             minStep: 1
           });
    this.cooler
		   .getCharacteristic(Characteristic.HeatingThresholdTemperature).onGet(this.getcoolerht.bind(this)).onSet(this.setcoolerht.bind(this))
		   .setProps({
			   minValue: this.min_temp,
			   maxValue: this.max_temp,
			   minStep: 1
			 });
    	return [infoService,this.cooler];
    }

	handleResponse(current_state,set_temperature,fan_state,current_temperature){
	   console.log("Update received from Coolmaster Unit for"+this.main+"."+this.indoor+":",current_state,set_temperature,fan_state,current_temperature);
       this.cooler.getCharacteristic(Characteristic.Active).updateValue(current_state);
       this.cooler.getCharacteristic(Characteristic.CoolingThresholdTemperature).updateValue(set_temperature);
       this.cooler.getCharacteristic(Characteristic.RotationSpeed).updateValue(fan_state);
       this.cooler.getCharacteristic(Characteristic.CurrentTemperature).updateValue(current_temperature);
	}
}
