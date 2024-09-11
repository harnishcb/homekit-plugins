var Service, Characteristic;
var net = require('net');
var source = require('./src.js')
var color_convert = require('./lib/color_conversion.js');
const data_convert = require('./lib/dpt.js');

var group_address = [];
var group_value = [];
var map = [];

var eliminate_read_GA = [];

module.exports = function(homebridge){
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-knx-accessories", "KNX-Accessory", knx);
};

function knx(log, config){
  this.log = log;
  this.ip = config["IP-Address"] || "localhost";
  this._switch= config["Switching-Load"];
  this._dim= config["Dimmable-Load"];
  this._tunable= config["CCT-Load"];
  this._ABSCurtain= config["Shutter-Blinds"];
  this._VenetianCurtain= config["Venetian-Blinds"];
  this._Fan= config["Fan-Load"];
  this._Occupancysensor= config["Occupancy-Sensor"];
  this._Motionsensor= config["Motion-Sensor"];
  this._Temperaturesensor= config["Temperature-Sensor"];
  this._Contact_Sensor = config["Contact-Sensor"];
  this._RGBW = config["RGBW-Load"];
  this._HVAC = config["HVAC"];
  this._Scene_Switch = config["Scene-Switch"];
  this._KNX_Lock = config["KNX-Lock"];
  this._outlet = config["Outlet"];
}

knx.prototype.accessories = function(callback){

	var log = this.log;


/*
 Feedback Socket Logic
*/
	this.client = new net.Socket();
	setTimeout(() => {
	this.client.connect(3672, 'localhost', function() {
	console.log('Connected to KNX - Manager');
    });
	},10000);
    this.client.on('data', function(data) {
	    data = data.toString();
        try {
        data = JSON.parse(String(data));
          var search_GA = data.topic;
          var location_GA = group_address.reduce((acc, element, index) => {
          if (element === search_GA) {
            acc.push(index);
          }
            return acc;
          }, []);
         console.log("Group Address location found at : ",location_GA);

		 for (var i=0;i<location_GA.length;i++){
          var temp_1 = location_GA[i];
           console.log('Received: '+ data.topic +" "+data.payload+"  Updated at:", map[temp_1]);
		   if (group_value[temp_1] != data.payload || eliminate_read_GA.indexOf(data.topic) !== -1 ){
		     group_value[temp_1] = Number(data.payload);
             results[map[temp_1]].updatevalue(Number(data.payload),temp_1);
		  }
		 }
		/*
        var temp_1 = group_address.indexOf(data.topic);
        if(temp_1 != -1){
        console.log('Received: '+ data.topic +" "+data.payload+"  Updated at:", map[temp_1]);
		 if (group_value[temp_1] != data.payload){
		  group_value[temp_1] = data.payload;
          results[map[temp_1]].updatevalue(data.payload,temp_1);
		 }
        } */
        } catch (e) {
          console.log(e);
        }
    });
    this.client.on('close', function() {
	this.client.connect(3672, 'localhost');
	console.log('Connection closed');
    });


/*
Polling of feedback at regular Interval
*/

setInterval(() => {
for(var t=0;t<group_address.length;t++){
  if (eliminate_read_GA.indexOf(group_address[t]) == -1){
	source.set('{"event": "GroupValue_Read","destination": "'+group_address[t]+'"}');
  }
}
}, 999999);

setTimeout(() => {
for(var t=0;t<group_address.length;t++){
  source.set('{"event": "GroupValue_Read","destination": "'+group_address[t]+'"}');
}
}, 12000);




var results = [];

/*
 Launches Switch if present in Configuration
*/
	if(Array.isArray(this._switch)){
     for(var i=0;i<this._switch.length;i++){
        map.push(results.length);
		group_address.push(this._switch[i]["Read-Switch-Addr"]);
		group_value.push(false);
		results.push(new knxswitch(this._switch[i]["Switch-Addr"],this._switch[i]["Read-Switch-Addr"] ,this._switch[i]["Name"],i));
	 }
	}

/*
 Launches Dimmer if present in Configuration
*/

	if(Array.isArray(this._dim)){
	 for(var i=0;i<this._dim.length;i++){
		var temp_length = results.length;
        map.push(temp_length , temp_length);
		group_address.push(this._dim[i]["Read-Switch-Addr"]);
		group_address.push(this._dim[i]["Read-Dim-Addr"]);
		group_value.push(false,0);
		results.push(new knxdimmer(this._dim[i]["Switch-Addr"], this._dim[i]["Dim-Addr"] ,this._dim[i]["Read-Switch-Addr"] ,this._dim[i]["Read-Dim-Addr"],this._dim[i]["Name"],i));
	 }
	}

/*
 Launches CCT if present in Configuration
*/

    if(Array.isArray(this._tunable)){
	 for(var i=0;i<this._tunable.length;i++){
        var temp = results.length;
        map.push(temp,temp,temp);
		group_value.push(false,0,4500);
		group_address.push(this._tunable[i]["Read-Switch-Addr"]);
		group_address.push(this._tunable[i]["Read-Dim-Addr"]);
		group_address.push(this._tunable[i]["Read-CT-Addr"]);
		results.push(new KNX_CCT(this._tunable[i]["Switch-Addr"],this._tunable[i]["Dim-Addr"],this._tunable[i]["CT-Addr"],this._tunable[i]["Read-Switch-Addr"],this._tunable[i]["Read-Dim-Addr"],this._tunable[i]["Read-CT-Addr"] ,this._tunable[i]["Name"],i ));		
	 }
	}

/*
 Launches RGBW if present in Configuration
*/

	if(Array.isArray(this._RGBW)){
	 for(var i=0;i<this._RGBW.length;i++){
        var temp = results.length;
        map.push(temp,temp,temp,temp,temp,temp);
		group_value.push(false,0,0,0,0,0);
		group_address.push(this._RGBW[i]["Read-Switch-Addr"]);
		group_address.push(this._RGBW[i]["Read-Dim-Addr"]);
		group_address.push(this._RGBW[i]["Read-Red-Addr"]);
		group_address.push(this._RGBW[i]["Read-Green-Addr"]);
		group_address.push(this._RGBW[i]["Read-Blue-Addr"]);
        group_address.push(this._RGBW[i]["Read-White-Addr"]);
		results.push(new knxRGBW(this._RGBW[i]["Switch-Addr"],this._RGBW[i]["Dim-Addr"],this._RGBW[i]["Red-Addr"],this._RGBW[i]["Green-Addr"],this._RGBW[i]["Blue-Addr"],this._RGBW[i]["White-Addr"], this._RGBW[i]["Read-Switch-Addr"], this._RGBW[i]["Read-Dim-Addr"], this._RGBW[i]["Read-Red-Addr"],this._RGBW[i]["Read-Green-Addr"],this._RGBW[i]["Read-Blue-Addr"],this._RGBW[i]["Read-White-Addr"],this._RGBW[i]["Name"],i ));		
	 }
	}

/*
 Launches Shutter Blinds if present in Configuration
*/

	if(Array.isArray(this._ABSCurtain)){
	 for(var i=0;i<this._ABSCurtain.length;i++){
        var temp = results.length;
        map.push(temp);
		group_value.push(0);
		group_address.push(this._ABSCurtain[i]["Read-Position-Addr"]);
		results.push(new knxabsolutecurtain(this._ABSCurtain[i]["Position-Addr"],this._ABSCurtain[i]["Read-Position-Addr"],this._ABSCurtain[i]["Name"],i,this._ABSCurtain[i]["Operation"] == "Normal"));		
	 }
	}

/*
 Launches Venetian Blinds if present in Configuration
*/
	if(Array.isArray(this._VenetianCurtain)){
	 for(var i=0;i<this._VenetianCurtain.length;i++){
        var temp = results.length;
        map.push(temp,temp);
		group_value.push(0,0);
		group_address.push(this._VenetianCurtain[i]["Read-Position-Addr"],this._VenetianCurtain[i]["Read-Angle-Addr"]);
		results.push(new knxcurtainvenetian(this._VenetianCurtain[i]["Position-Addr"],this._VenetianCurtain[i]["Angle-Addr"],this._VenetianCurtain[i]["Read-Position-Addr"],this._VenetianCurtain[i]["Read-Angle-Addr"],this._VenetianCurtain[i]["Name"],i));		
	 }
	}

/*
 Launches Occupancy Sensor if present in Configuration
*/

	if(Array.isArray(this._Occupancysensor)){
     for(var i=0;i<this._Occupancysensor.length;i++){
        map.push(results.length);
		group_address.push(this._Occupancysensor[i]["Read-Addr"]);
		group_value.push(0);
		results.push(new KNX_Occupancy_Sensor(this._Occupancysensor[i]["Read-Addr"], this._Occupancysensor[i]["Operation"] == "Normal", this._Occupancysensor[i]["Name"],i));
	 }
	 }

/*
 Launches Temperature Sensor if present in Configuration
*/

	if(Array.isArray(this._Temperaturesensor)){
     for(var i=0;i<this._Temperaturesensor.length;i++){
        map.push(results.length);
		group_address.push(this._Temperaturesensor[i]["Read-Addr"]);
		group_value.push(0);
		results.push(new knxtemperaturesensor(this._Temperaturesensor[i]["Read-Addr"] ,this._Temperaturesensor[i]["Name"],i));
	 }
	 }

/*
 Launches Motion Sensor if present in Configuration
*/

if(Array.isArray(this._Motionsensor)){
	for(var i=0;i<this._Motionsensor.length;i++){
	   map.push(results.length);
	   group_address.push(this._Motionsensor[i]["Read-Addr"]);
	   group_value.push(0);
	   results.push(new KNX_Motion_Sensor(this._Motionsensor[i]["Read-Addr"], this._Motionsensor[i]["Operation"] == "Normal", this._Motionsensor[i]["Name"],i));
	}
	}

/*
 Launches Contact Sensor if present in Configuration
*/

if(Array.isArray(this._Contact_Sensor)){
	for(var i=0;i<this._Contact_Sensor.length;i++){
	   map.push(results.length);
	   group_address.push(this._Contact_Sensor[i]["Read-Addr"]);
	   group_value.push(0);
	   results.push(new KNX_Contact_Sensor(this._Contact_Sensor[i]["Read-Addr"], this._Contact_Sensor[i]["Operation"] == "Normal", this._Contact_Sensor[i]["Name"],i));
	}
	}

/*
 Launches Fan Sensor if present in Configuration
*/

if(Array.isArray(this._Fan)){
	for(var i=0;i<this._Fan.length;i++){
		var temp_length = results.length;
        map.push(temp_length , temp_length);
		group_address.push(this._Fan[i]["Read-Switch-Addr"]);
		group_address.push(this._Fan[i]["Read-Dim-Addr"]);
		group_value.push(false,0);
		var dim_trigger_value = [0];
		if (this._Fan[i]["Step_1 Value"] !== "NA"){
			dim_trigger_value.push(parseInt(this._Fan[i]["Step_1 Value"]));
		}
		if (this._Fan[i]["Step_2 Value"] !== "NA"){
			dim_trigger_value.push(parseInt(this._Fan[i]["Step_2 Value"]));
		}
		if (this._Fan[i]["Step_3 Value"] !== "NA"){
			dim_trigger_value.push(parseInt(this._Fan[i]["Step_3 Value"]));
		}
		if (this._Fan[i]["Step_4 Value"] !== "NA"){
			dim_trigger_value.push(parseInt(this._Fan[i]["Step_4 Value"]));
		}
		if (this._Fan[i]["Step_5 Value"] !== "NA"){
			dim_trigger_value.push(parseInt(this._Fan[i]["Step_5 Value"]));
		}

        var correction_factor;
		if (this._Fan[i]["Datapoint-Type"] == "DPT 5.001 (0-100%)"){
			correction_factor = 2.55;
		}
		else {
			correction_factor = 1;
		}
		results.push(new knxFan(this._Fan[i]["Switch-Addr"], this._Fan[i]["Dim-Addr"] ,this._Fan[i]["Read-Switch-Addr"] ,this._Fan[i]["Read-Dim-Addr"],correction_factor,dim_trigger_value,this._Fan[i]["Name"],i));
	}
	}

/*
Launches HVAC if present in the configuration
*/

if(Array.isArray(this._HVAC)){
	for(var i=0;i<this._HVAC.length;i++){
		var temp_length = results.length;
        map.push(temp_length ,temp_length, temp_length ,temp_length);
		group_address.push(this._HVAC[i]["Read-Switch-Addr"]);
		group_address.push(this._HVAC[i]["Read-Mode-Addr"]);
		group_address.push(this._HVAC[i]["Read-Setpoint-Addr"]);
		group_address.push(this._HVAC[i]["Read-Fan-Addr"]);
		group_value.push(0,0,3148,1);

		var fan_value = [];
		if (this._HVAC[i]["Fan Step_1 Value"] !== "NA" && typeof this._HVAC[i]["Fan Step_1 Value"] == "number"){
			fan_value.push(parseInt(this._HVAC[i]["Fan Step_1 Value"]));
		}
		if (this._HVAC[i]["Fan Step_2 Value"] !== "NA" && typeof this._HVAC[i]["Fan Step_2 Value"] == "number"){
			fan_value.push(parseInt(this._HVAC[i]["Fan Step_2 Value"]));
		}
		if (this._HVAC[i]["Fan Step_3 Value"] !== "NA" && typeof this._HVAC[i]["Fan Step_3 Value"] == "number"){
			fan_value.push(parseInt(this._HVAC[i]["Fan Step_3 Value"]));
		}
		if (this._HVAC[i]["Fan Step_4 Value"] !== "NA" && typeof this._HVAC[i]["Fan Step_4 Value"] == "number"){
			fan_value.push(parseInt(this._HVAC[i]["Fan Step_4 Value"]));
		}

        var fan_correction_factor;
		if (this._HVAC[i]["Fan Datapoint-Type"] == "DPT 5.001 (0-100%)"){
			fan_correction_factor = 2.55;
		}
		else {
			fan_correction_factor = 1;
		}

		results.push(new HVAC(this._HVAC[i]["Switch-Addr"], this._HVAC[i]["Read-Switch-Addr"], this._HVAC[i]["Setpoint-Addr"], this._HVAC[i]["Read-Setpoint-Addr"], this._HVAC[i]["Fan-Addr"], this._HVAC[i]["Read-Fan-Addr"], fan_value, fan_correction_factor,this._HVAC[i]["Mode-Addr"], this._HVAC[i]["Read-Mode-Addr"], this._HVAC[i]["Minimum_Temperature"], this._HVAC[i]["Maximum_Temperature"], this._HVAC[i]["Name"],i));
	}
	}


/*
 Launches KNX Scene Switch if present in Configuration
*/

if(Array.isArray(this._Scene_Switch)){
	for(var i=0;i<this._Scene_Switch.length;i++){
        var temp_length = results.length;
        map.push(temp_length);
		group_address.push(this._Scene_Switch[i]["Read-Scene-Addr"]);
		eliminate_read_GA.push(this._Scene_Switch[i]["Read-Scene-Addr"]);
		group_value.push(0);
		var scene_value = [];
        if(this._Scene_Switch[i]["Value_Single_Click"] !== 0 && typeof this._Scene_Switch[i]["Value_Single_Click"] == "number"){
			scene_value.push(this._Scene_Switch[i]["Value_Single_Click"]);
		}
		else{
			scene_value.push("NA");
		}

		if(this._Scene_Switch[i]["Value_Double_Click"] !== 0 && typeof this._Scene_Switch[i]["Value_Double_Click"] == "number"){
			scene_value.push(this._Scene_Switch[i]["Value_Double_Click"]);
		}
		else{
			scene_value.push("NA");
		}

		if(this._Scene_Switch[i]["Value_Long_Click"] !== 0 && typeof this._Scene_Switch[i]["Value_Long_Click"] == "number"){
			scene_value.push(this._Scene_Switch[i]["Value_Long_Click"]);
		}
		else{
			scene_value.push("NA");
		}
		results.push(new KNX_Stateless_Programmable_Switch(this._Scene_Switch[i]["Read-Scene-Addr"], scene_value, this._Scene_Switch[i]["Name"], i));
	}
}



/*
 Launches Lock (Unlock Only) if present in Configuration
*/

if(Array.isArray(this._KNX_Lock)){
	for(var i=0;i<this._KNX_Lock.length;i++){
	   map.push(results.length);
	   group_address.push(this._KNX_Lock[i]["Read-Lock-Addr"]);
	   group_value.push(false);
	   results.push(new KNX_Lock(this._KNX_Lock[i]["Lock-Addr"],this._KNX_Lock[i]["Read-Lock-Addr"] ,this._KNX_Lock[i]["Name"],i));
	}
	}

/*
 Launches Outlet if present in Configuration
*/
if(Array.isArray(this._outlet)){
	for(var i=0;i<this._outlet.length;i++){
	   map.push(results.length);
	   group_address.push(this._outlet[i]["Read-Switch-Addr"]);
	   group_value.push(false);
	   results.push(new KNX_Outlet(this._outlet[i]["Switch-Addr"],this._outlet[i]["Read-Switch-Addr"] ,this._outlet[i]["Name"], i, log));
	}
}

    console.log(map , group_address);
	callback(results);
}


/*
Class for KNX Switch
*/
class knxswitch{
  constructor(addr_dpt1,status_dpt1,name,no){
	this.addr_dpt1 =  addr_dpt1;
	this.state_switch = group_address.indexOf(status_dpt1);
	this.name = "KNXSwt-"+name+String(no);
    this.knxswitch = new Service.Switch(this.name);
    }

    set_dpt1(stt){
	source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.addr_dpt1+'","value":'+String(Number(stt))+'}');
	}
    get_dpt1(){
	return Boolean(group_value[this.state_switch]);
	}

    getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXSWITCH")
         .setCharacteristic(Characteristic.SerialNumber, this.name);
      this.knxswitch
         .getCharacteristic(Characteristic.On).onGet(this.get_dpt1.bind(this)).onSet(this.set_dpt1.bind(this)); 
	 return [infoService,this.knxswitch];
    }

  	 updatevalue(val,pos){
		if (pos == this.state_switch){
			console.log("Updated Requested to Switch",val);
			this.knxswitch.getCharacteristic(Characteristic.On).updateValue(Boolean(val));
		}
	}
}


/*
Class for KNX Dimmer
*/
class knxdimmer{
  constructor(addr_dpt1,addr_dpt5,status_dpt1,status_dpt5,name,no){
	this.addr_dpt1 =  addr_dpt1;
	this.addr_dpt5 =  addr_dpt5;
	this.state_switch = group_address.indexOf(status_dpt1);
	this.state_dimmer = group_address.indexOf(status_dpt5);
	this.name = "KNXDim-"+name+String(no);
	this.execute = true;
	this.dim_val = 0;
    this.knxdimmer = new Service.Lightbulb(this.name);
    }

    set_dpt1(stt){
      setTimeout(() => {
		if(this.execute){
		source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.addr_dpt1+'","value":'+String(stt)+'}');
	   }
	  },100);
	}
    get_dpt1(){
	 return Boolean(group_value[this.state_switch]);
	}

    set_dpt5(stt){
	 this.execute = false;
	 this.dim_val = stt;
	 if (stt > 0){
		source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.addr_dpt1+'","value":1}');
	 }
	 source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.addr_dpt5+'","value":'+String(stt)+'}');
	 setTimeout(() => this.execute = true, 11000);
	}
    get_dpt5(){
	 return Math.round(group_value[this.state_dimmer]/2.55);
	}

    getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXDIMMER")
         .setCharacteristic(Characteristic.SerialNumber, this.name);
      this.knxdimmer
         .getCharacteristic(Characteristic.On).onGet(this.get_dpt1.bind(this)).onSet(this.set_dpt1.bind(this));
      this.knxdimmer
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_dpt5.bind(this)).onSet(this.set_dpt5.bind(this));

	 return [infoService,this.knxdimmer];
    }

  	 updatevalue(val,pos){

	  if(pos == this.state_switch){
           console.log("Updated Requested to Switch:",val,pos,this.state_switch);
	       this.knxdimmer.getCharacteristic(Characteristic.On).updateValue(Boolean(val));
	  }
	  else if(pos == this.state_dimmer){
		if(!this.execute){
            setTimeout(() => {
				console.log("Current Condition for Update Values",this.dim_val , Math.round(group_value[this.state_dimmer]/2.55));
				if (Math.abs(this.dim_val - Math.round(group_value[this.state_dimmer]/2.55)) < 2 ){
				  console.log("Value Accepted for Update:",val);
				  this.knxdimmer.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(group_value[this.state_dimmer]/2.55));
				}
			 }, 1200);
			 setTimeout(() => this.knxdimmer.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(group_value[this.state_dimmer]/2.55)), 11000);
		}
		else {
			 this.knxdimmer.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(group_value[this.state_dimmer]/2.55));
		}
	}
	}
}


/*
Class for KNX CCT
*/

class KNX_CCT{
  constructor(addr_dpt1,addr_dpt5,addr_dpt9,status_dpt1,status_dpt5,status_dpt9,name,no){
	this.addr_dpt1 =  addr_dpt1;
	this.addr_dpt5 =  addr_dpt5;
	this.addr_dpt9 =  addr_dpt9;
	this.state_switch = group_address.indexOf(status_dpt1);
	this.state_dimmer = group_address.indexOf(status_dpt5);
	this.state_color_temperature = group_address.indexOf(status_dpt9);
	this.name = "KNXCCT-"+name+String(no);
    this.KNX_CCT = new Service.Lightbulb(this.name);
	this.dim_val = 0;
    this.execute = true;
	this.ct = 2700;
    }

    set_dpt1(stt){
		if (this.execute){
			source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.addr_dpt1+'","value":'+String(stt)+'}');
		}
	}
    get_dpt1(){
	    return Boolean(group_value[this.state_switch]);
	}

	set_dpt5(stt){
		this.execute = false;
		this.dim_val = stt;
		setTimeout(() => this.execute = true, 11000);
		source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.addr_dpt5+'","value":'+String(stt)+'}');
	}
    get_dpt5(){
	    return Math.round(group_value[this.state_dimmer]/2.55);
	}

	set_dpt9(stt){
		stt = Math.round(1000000/stt);
		source.set('{"dpt": "7.600","event":"GroupValue_Write","destination":"'+this.addr_dpt9+'","value":'+String(stt)+'}');
		this.ct = stt;
	}
    get_dpt9(){
		if (Math.abs(this.ct - group_value[this.state_color_temperature]) < 20){
			group_value[this.state_color_temperature] = this.ct;
		}
	    return Math.round(1000000/group_value[this.state_color_temperature]);
	}

    getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXCOLORTEMPERATURE")
         .setCharacteristic(Characteristic.SerialNumber,  this.name);
      this.KNX_CCT
         .getCharacteristic(Characteristic.On).onGet(this.get_dpt1.bind(this)).onSet(this.set_dpt1.bind(this));
      this.KNX_CCT
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_dpt5.bind(this)).onSet(this.set_dpt5.bind(this)); 
      this.KNX_CCT
         .getCharacteristic(Characteristic.ColorTemperature).onGet(this.get_dpt9.bind(this)).onSet(this.set_dpt9.bind(this))
         .setProps({
           minValue: 140,
           maxValue: 500,
           minStep: 1
         });
	 return [infoService,this.KNX_CCT];
    }
  	 updatevalue(val,pos){
	  if(pos == this.state_switch){
	    console.log("Updated received for On Characteristics of CCT Light:",this.name,",with new value:",val);
	    this.KNX_CCT.getCharacteristic(Characteristic.On).updateValue(Boolean(Number(val)));
	  }
	  else if(pos == this.state_dimmer){
		if(!this.execute){
			console.log("Updated received for Brightness Characteristics of CCT Light:",this.name,",with new value:",val);
			setTimeout(() => {
				console.log("Current Condition for Update Values",this.dim_val , Math.round(group_value[this.state_dimmer]/2.55));
				if (Math.abs(this.dim_val - Math.round(group_value[this.state_dimmer]/2.55)) < 2 ){
				  console.log("Value Accepted for Update:",val);
				  this.KNX_CCT.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(group_value[this.state_dimmer]/2.55));
				}
			 }, 1200);
	    setTimeout(() => this.KNX_CCT.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(group_value[this.state_dimmer]/2.55)), 11000);
		}
		else {
			this.KNX_CCT.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(group_value[this.state_dimmer]/2.55));
		}
	}
	  else if (pos == this.state_color_temperature) {
		if (Math.abs(val - this.ct) < 20) {
			val = this.ct;
		}
		console.log("Updated received for Color Temperature Characteristics of CCT Light:",this.name,",with new value:",val);
	    this.KNX_CCT.getCharacteristic(Characteristic.ColorTemperature).updateValue(Math.round(1000000/val));
	  }
	}
}


/*
Class for KNX RGBW
*/

class knxRGBW{
  constructor(addr_dpt1,addr_dpt5,R_addr_dpt5,G_addr_dpt5,B_addr_dpt5,W_addr_dpt5,status_dpt1,status_dpt5,R_status_dpt5,G_status_dpt5,B_status_dpt5,W_status_dpt5,name,no){	 
	this.addr_dpt1 =  addr_dpt1;
	this.addr_dpt5 = addr_dpt5;
	this.R_addr_dpt5 =  R_addr_dpt5;
	this.G_addr_dpt5 =  G_addr_dpt5;
	this.B_addr_dpt5 =  B_addr_dpt5;
	this.W_addr_dpt5 =  W_addr_dpt5;
	this.state_switch = group_address.indexOf(status_dpt1);
	this.state_dimmer = group_address.indexOf(status_dpt5);
	this.state_R = group_address.indexOf(R_status_dpt5);
	this.state_G = group_address.indexOf(G_status_dpt5);
	this.state_B = group_address.indexOf(B_status_dpt5);
	this.state_W = group_address.indexOf(W_status_dpt5);
	this.name = "KNXRGB-"+name+String(no);
    this.execute = true;
    this.knxRGBW = new Service.Lightbulb(this.name);
	this.hue = 0;
	this.saturation = 100;
	this.value = 0;
  }
    set_dpt1(stt){
		console.log("Homekit Trigger RGBW");
		if(this.execute){
			source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.addr_dpt1+'","value":'+String(stt)+'}');
		}
	}
    get_dpt1(){
		return group_value[this.state_switch];
	}

    set_dpt5(stt){
		this.execute = false;
		this.value = stt;
		this.set_color();
		setTimeout(() => this.execute = true, 100);
	}
    get_dpt5(){
		return group_value[this.state_dimmer];
	}

	set_Hue_dpt5(stt){
		this.hue = stt;
   		this.set_color();
 	}
    get_Hue_dpt5(){
		return 359;
	}

	set_Saturation_dpt5(stt){
		this.saturation = stt
		this.set_color();
    }
    get_Saturation_dpt5(){
		return 100;
	}

	set_color(){
		console.log(this.hue, this.saturation, this.value);
		let color = color_convert.hsvToRgb(this.hue, this.saturation, this.value);
		console.log(color);
		source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.R_addr_dpt5+'","value":'+String(color[0])+'}');
		source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.G_addr_dpt5+'","value":'+String(color[1])+'}');
		source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.B_addr_dpt5+'","value":'+String(color[2])+'}');
		source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.W_addr_dpt5+'","value":'+String(color[3])+'}');
	}

    getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXRGB")
         .setCharacteristic(Characteristic.SerialNumber,  this.name);
      this.knxRGBW
         .getCharacteristic(Characteristic.On).onGet(this.get_dpt1.bind(this)).onSet(this.set_dpt1.bind(this)); 
      this.knxRGBW
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_dpt5.bind(this)).onSet(this.set_dpt5.bind(this)); 
      this.knxRGBW
         .getCharacteristic(Characteristic.Hue).onGet(this.get_Hue_dpt5.bind(this)).onSet(this.set_Hue_dpt5.bind(this));
      this.knxRGBW
         .getCharacteristic(Characteristic.Saturation).onGet(this.get_Saturation_dpt5.bind(this)).onSet(this.set_Saturation_dpt5.bind(this));
 
	 return [infoService,this.knxRGBW];
    }
  	 updatevalue(val,pos){
	  if(pos == this.state_switch){
	   this.knxRGBW.getCharacteristic(Characteristic.On).updateValue(val);
	  }
	  else if(pos == this.state_dimmer){
	   this.knxRGBW.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(val/2.55));
	  }
	  else {
	   this.knxRGBW.getCharacteristic(Characteristic.Hue).updateValue(val);
	   this.knxRGBW.getCharacteristic(Characteristic.Saturation).updateValue(val);
	  }
	}
}


/*
Class for KNX Fan
*/
class knxFan{
  constructor(addr_dpt1,addr_dpt5,status_dpt1,status_dpt5,correction_factor,value_set,name,no){
	this.addr_dpt1 =  addr_dpt1;
	this.addr_dpt5 =  addr_dpt5;
	this.state_switch = group_address.indexOf(status_dpt1);
	this.state_dimmer = group_address.indexOf(status_dpt5);
    this.correction_factor = correction_factor;
	this.value_set = value_set;
	this.fan_step = value_set.length-1;
	this.name = name+no;
	this.execute = true;
	this.dim_val = 0;
    this.knxFan = new Service.Fan(this.name);
	this.execute = true;
  }
    set_dpt1(stt){
		setTimeout(() => {
		if(this.execute){
		source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.addr_dpt1+'","value":'+String(stt)+'}');
		}
	    },500);
	}
    get_dpt1(){
	  return Boolean(group_value[this.state_switch]);
	}

    set_dpt5(stt){
		this.execute = false;
    	this.dim_val = stt;
	    setTimeout(() => this.execute = true, 2000);
		source.set('{"dpt": "5.004","event":"GroupValue_Write","destination":"'+this.addr_dpt5+'","value":'+String(Math.round(this.value_set[stt/(Math.round(100/this.fan_step))] * this.correction_factor))+'}');
	}
    get_dpt5(){
	  return Math.round((100/this.fan_step)* (this.value_set.indexOf(Math.round(group_value[this.state_dimmer]/this.correction_factor))));
	}

    getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXFANUNIVERSAL")
         .setCharacteristic(Characteristic.SerialNumber, this.name);
      this.knxFan
         .getCharacteristic(Characteristic.On).onGet(this.get_dpt1.bind(this)).onSet(this.set_dpt1.bind(this));
      this.knxFan
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.get_dpt5.bind(this)).onSet(this.set_dpt5.bind(this))
		 .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: Math.round(100/this.fan_step)
    	});
	 return [infoService,this.knxFan];
    }

	updatevalue(val,pos){
		if(pos == this.state_switch){
			console.log("Updated Requested to Fan State:",val,pos,this.state_switch);
			this.knxFan.getCharacteristic(Characteristic.On).updateValue(Boolean(val));
	   }
	   else if(pos == this.state_dimmer){
		 if(!this.execute){
			 setTimeout(() => {
				 console.log("Current Condition for Update Values",this.dim_val , Math.round((100/this.fan_step)* (this.value_set.indexOf(Math.round(group_value[this.state_dimmer]/this.correction_factor)))));
				   console.log("Value Accepted for Update:",val);
				   this.knxFan.getCharacteristic(Characteristic.RotationSpeed).updateValue(Math.round((100/this.fan_step)* (this.value_set.indexOf(Math.round(group_value[this.state_dimmer]/this.correction_factor)))));
			  }, 3500);
			  setTimeout(() => this.knxFan.getCharacteristic(Characteristic.RotationSpeed).updateValue(Math.round((100/this.fan_step)* (this.value_set.indexOf(Math.round(group_value[this.state_dimmer]/this.correction_factor))))), 5500);
		 }
		 else {
			  this.knxFan.getCharacteristic(Characteristic.RotationSpeed).updateValue(Math.round((100/this.fan_step)* (this.value_set.indexOf(Math.round(group_value[this.state_dimmer]/this.correction_factor)))));
		 }
	 }
  }
}


/*
Class for KNX Shutter Blinds
*/

class knxabsolutecurtain{
	constructor(addr_dpt5,status_dpt5,name,no,direction){
	this.addr_dpt5 =  addr_dpt5;
	this.state_curtain = group_address.indexOf(status_dpt5);
	this.name = "KNXShutter-"+name+String(no);
	this.direction = direction;
    this.knxabsolutecurtain  = new Service.WindowCovering(this.name);
	this.position_state = 2;
	}
     set_dpt5(stt){
		if ((stt - group_value[this.state_curtain]) > 0){
			this.position_state = 1
		 } else {
			this.position_state = 0;
		 }
		 if(!this.direction){
			stt = 100-stt;
		 }
		 source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.addr_dpt5+'","value":'+String(stt)+'}');
	    }
	 get_dpt5(){
         var temp_1 = Math.round(group_value[this.state_curtain]/2.55);
		 if(!this.direction){
			temp_1 = 100 -temp_1;
		 }
	     return temp_1;
	}
	 getknxabspos(){
         return this.position_state;
    }
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXCURTAINABSOLUTE")
         .setCharacteristic(Characteristic.SerialNumber,  this.name);
      this.knxabsolutecurtain
         .getCharacteristic(Characteristic.CurrentPosition).onGet(this.get_dpt5.bind(this));
      this.knxabsolutecurtain
         .getCharacteristic(Characteristic.TargetPosition).onGet(this.get_dpt5.bind(this)).onSet(this.set_dpt5.bind(this));
      this.knxabsolutecurtain
         .getCharacteristic(Characteristic.PositionState).onGet(this.getknxabspos.bind(this));
	  return [infoService,this.knxabsolutecurtain];
	}

	 updatevalue(val,pos){
		val = val/2.55;
		if(!this.direction){
		  val = 100-val;
		}
		this.position_state = 2;
    	this.knxabsolutecurtain.getCharacteristic(Characteristic.TargetPosition).updateValue(Math.round(val));
	    this.knxabsolutecurtain.getCharacteristic(Characteristic.CurrentPosition).updateValue(Math.round(val));
	}
}

/*


class knxdrycurtain{
	constructor(addr_dpt5,client,platform,no){	 
	this.addr_dpt5 =  addr_dpt5.split("/").join(".");	
	this.client = client;
	this.platform = platform;
	this.no = String(no);
	this.name= "Curtain Dry-"+this.no;
    this.knxdrycurtain  = new Service.WindowCovering(this.name);	
	}

     set_dpt5(stt,callback){
      //  this.client.write("");  
		this.knxdrycurtain.getCharacteristic(Characteristic.TargetPosition).updateValue(stt, null);
		this.knxdrycurtain.getCharacteristic(Characteristic.CurrentPosition).updateValue(stt, null);
        callback(null);
	} 
	 
	get_dpt5(callback){
	     callback(null, );
	}
	
	getknxdrycurtainval(callback){
		 callback(null, );
	}	
	 getknxabspos(callback){
     	 callback(null, 2);
    }	
	getServices(){
 
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXCURTAINDRY")
         .setCharacteristic(Characteristic.SerialNumber,  this.name);
      this.knxdrycurtain
         .getCharacteristic(Characteristic.CurrentPosition).on('get', this.getknxdrycurtain.bind(this))
	 .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: 100
         });
     this.knxdrycurtain
        .getCharacteristic(Characteristic.TargetPosition).on('get', this.get_dpt5.bind(this)).on('set', this.set_dpt5.bind(this))
        .setProps({
           minValue: 0,
           maxValue: 100,
           minStep: 100
         });
      this.knxdrycurtain
         .getCharacteristic(Characteristic.PositionState).on('get', this.getknxabspos.bind(this))
		 .setProps({
           minValue: 1,
           maxValue: 2,
           minStep: 1
         });		 
	 return [infoService,this.knxdrycurtain];
	}
	 updatevalue_dpt5(val){
	 this.knxdrycurtain.getCharacteristic(Characteristic.CurrentPosition).updateValue(val, null);
	}
}

*/

/*
Class for KNX Venetian Blinds
*/

class knxcurtainvenetian{
	constructor(addr_dpt5_position,addr_dpt5_angle,status_dpt5_position,status_dpt5_angle,name,no){
	this.addr_dpt5_position =  addr_dpt5_position;
	this.addr_dpt5_angle =  addr_dpt5_angle;
	this.state_curtain_position = group_address.indexOf(status_dpt5_position);
	this.state_curtain_angle = group_address.indexOf(status_dpt5_angle);
	this.name = "KNXVenetian-"+name+String(no);
    this.knxcurtainvenetian  = new Service.WindowCovering(this.name);
	}
    set_dpt5_position(stt){
	 source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.addr_dpt5_position+'","value":'+String(100-stt)+'}');		
	}
	get_dpt5_position(){
        var temp_2 = 100-group_value[this.state_curtain_position];
        return temp_2;
	}
	set_dpt5_angle(stt){
     stt = Math.round((5*(stt+90))/9);
	 source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.addr_dpt5_angle+'","value":'+String(stt)+'}');		
	}
	get_dpt5_angle(){
	     return  (Math.round(group_value[this.state_curtain_angle]*(9/5)))-90;
	}
	getknxabspos(){
     	 return 2;
    }
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXCURTAINVENETIAN")
         .setCharacteristic(Characteristic.SerialNumber,  this.name);
      this.knxcurtainvenetian
         .getCharacteristic(Characteristic.CurrentPosition).onGet(this.get_dpt5_position.bind(this));
      this.knxcurtainvenetian
        .getCharacteristic(Characteristic.TargetPosition).onGet(this.get_dpt5_position.bind(this)).onSet(this.set_dpt5_position.bind(this));
      this.knxcurtainvenetian
         .getCharacteristic(Characteristic.PositionState).onGet(this.getknxabspos.bind(this))
     this.knxcurtainvenetian
        .getCharacteristic(Characteristic.CurrentHorizontalTiltAngle).onGet(this.get_dpt5_angle.bind(this));
 	 this.knxcurtainvenetian
        .getCharacteristic(Characteristic.TargetHorizontalTiltAngle).onGet(this.get_dpt5_angle.bind(this)).onSet(this.set_dpt5_angle.bind(this));	 
	 return [infoService,this.knxcurtainvenetian];
	}

	 updatevalue(val,pos){
	  if(this.state_curtain_position == pos){
	   this.knxcurtainvenetian.getCharacteristic(Characteristic.TargetPosition).updateValue(100-Math.round(val/2.55));
	   this.knxcurtainvenetian.getCharacteristic(Characteristic.CurrentPosition).updateValue(100-Math.round(val/2.55));
	  }
	  else{
	   val = (Math.round(val*(9/5)))-90;
	   this.knxcurtainvenetian.getCharacteristic(Characteristic.TargetHorizontalTiltAngle).updateValue(val);
	   this.knxcurtainvenetian.getCharacteristic(Characteristic.CurrentHorizontalTiltAngle).updateValue(val);
	  }
	}
}





/*
Class for KNX Contact Sensor
*/

class KNX_Contact_Sensor{
	constructor(status_dpt1_contact,operation,name,no){
	this.state_contact = group_address.indexOf(status_dpt1_contact);
	this.operation = operation;
	this.name= "KNXCS-"+name+String(no);
    this.KNX_Contact_Sensor  = new Service.ContactSensor(this.name);
	}

	get_current_state(){
		if (this.operation){
			return Number(group_value[this.state_contact]);
		}
		else{
			return 1-Number(group_value[this.state_contact]);

		}
	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXCONTACTSENSOR")
         .setCharacteristic(Characteristic.SerialNumber,  this.name);
      this.KNX_Contact_Sensor
         .getCharacteristic(Characteristic.ContactSensorState).onGet(this.get_current_state.bind(this));
   	  return [infoService,this.KNX_Contact_Sensor];
	}

	 updatevalue(val){
       if(Number(val) == 0 || Number(val) == 1){
		console.log("Updated state for Contact Sensor:",this.name,"with value:",val);
		if (this.operation){
			this.KNX_Contact_Sensor.getCharacteristic(Characteristic.ContactSensorState).updateValue(Number(val));
		}
		else {
			this.KNX_Contact_Sensor.getCharacteristic(Characteristic.ContactSensorState).updateValue(1 - Number(val));
		}
	   }
	   else{
		console.log("Received an Illegal value for Contact Sensor:",this.name,"with value:",val)
	   }
	}
}



/*
Class for KNX Occupancy Sensor
*/

class KNX_Occupancy_Sensor{
	constructor(status_dpt1_occupancy,operation,name,no){
	this.state_occupancy = group_address.indexOf(status_dpt1_occupancy);
	this.operation = operation;
	this.name= "KNXOCP-"+name+String(no);
    this.KNX_Occupancy_Sensor = new Service.OccupancySensor(this.name);
	}

	get_current_state(){
		if (this.operation){
			return Number(group_value[this.state_occupancy]);
		}
		else {
			return 1-Number(group_value[this.state_occupancy]);
		}
	}
	getServices(){

      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXOCCUPANCYSENSOR")
         .setCharacteristic(Characteristic.SerialNumber, this.name);
      this.KNX_Occupancy_Sensor
         .getCharacteristic(Characteristic.OccupancyDetected).onGet(this.get_current_state.bind(this));
   	  return [infoService,this.KNX_Occupancy_Sensor];
	}

	 updatevalue(val){
		if(Number(val) == 0 || Number(val) == 1){
			console.log("Updated state for Occupancy Sensor:",this.name,"with value:",val);
			if (this.operation){
				this.KNX_Occupancy_Sensor.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Number(val));
			}
			else{
				this.KNX_Occupancy_Sensor.getCharacteristic(Characteristic.OccupancyDetected).updateValue(1-Number(val));				
			}
		}
		else {
		    console.log("Received an Illegal value for Occupancy Sensor:",this.name,"with value:",val)
		}
		}
}



/*
Class for KNX Motion Sensor
*/

class KNX_Motion_Sensor{
	constructor(status_dpt1_occupancy,operation,name,no){
	this.state_occupancy = group_address.indexOf(status_dpt1_occupancy);
	this.operation = operation;
	this.name= "KNXOCP-"+name+String(no);
    this.KNX_Motion_Sensor = new Service.MotionSensor(this.name);
	}

	get_current_state(){
		if (this.operation){
			return Number(group_value[this.state_occupancy]);
		}
		else {
			return 1-Number(group_value[this.state_occupancy]);
		}
	}
	getServices(){

      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "CBTCUEKNXOCCUPANCYSENSOR")
         .setCharacteristic(Characteristic.SerialNumber, this.name);
      this.KNX_Motion_Sensor
         .getCharacteristic(Characteristic.MotionDetected).onGet(this.get_current_state.bind(this));
   	  return [infoService,this.KNX_Motion_Sensor];
	}

	 updatevalue(val){
		if(Number(val) == 0 || Number(val) == 1){
			console.log("Updated state for Motion Sensor:",this.name,"with value:",val);
			if (this.operation){
				this.KNX_Motion_Sensor.getCharacteristic(Characteristic.MotionDetected).updateValue(Number(val));
			}
			else {
				this.KNX_Motion_Sensor.getCharacteristic(Characteristic.MotionDetected).updateValue(1-Number(val));
			}
		}
		else {
		    console.log("Received an Illegal value for Motion Sensor:",this.name,"with value:",val)
		}
		}
}


/*
Class for KNX Temperature Sensor
*/

class knxtemperaturesensor{
	constructor(status_dpt9_occupancy,name,no){
	this.state_temperature = group_address.indexOf(status_dpt9_occupancy);
	this.name= "KNXTS-"+name+String(no);
    this.knxtemperaturesensor = new Service.TemperatureSensor(this.name);
	}

	get_current_state(){
	     return data_convert.convert_dpt9(Number(group_value[this.state_temperature]));
	}
	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solutions Pvt. Ltd.")
         .setCharacteristic(Characteristic.Model, "CBTCUEknxtemperaturesensor")
         .setCharacteristic(Characteristic.SerialNumber, this.name);
      this.knxtemperaturesensor
         .getCharacteristic(Characteristic.CurrentTemperature).onGet(this.get_current_state.bind(this)); 
   	  return [infoService,this.knxtemperaturesensor];
	}

	 updatevalue(val){
	 this.knxtemperaturesensor.getCharacteristic(Characteristic.CurrentTemperature).updateValue(data_convert.convert_dpt9(Number(val)));
	}
}


/*
Class for KNX HVAC
*/

class HVAC{
	constructor(swt_addr_dpt1,swt_status_dpt1,temp_addr_dpt9,temp_status_dpt9,fan_addr_dpt5,fan_status_dpt5,fan_value_set,fan_correction_factor,mode_addr_dpt5,mode_status_dpt5,min_temp,max_temp,name,no){
        this.swt_addr_dpt1 =  swt_addr_dpt1;
	    this.temp_addr_dpt9 =  temp_addr_dpt9;
		this.fan_addr_dpt5 = fan_addr_dpt5;
		this.mode_addr_dpt5 = mode_addr_dpt5;
	    this.swt_status_dpt1 = group_address.indexOf(swt_status_dpt1);
	    this.temp_status_dpt9 = group_address.indexOf(temp_status_dpt9);
		this.fan_status_dpt5 = group_address.indexOf(fan_status_dpt5);
		this.mode_status_dpt5 = group_address.indexOf(mode_status_dpt5);
		this.fan_value_set = fan_value_set;
		this.fan_correction_factor = fan_correction_factor;
		this.Minimum_Temperature = min_temp;
		this.Maximum_Temperature = max_temp;
		this.name = name+"KNXHVAC"+String(no);
		this.HVAC = new Service.HeaterCooler(this.name);
	}


	set_hvac_state(stt){
		source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.swt_addr_dpt1+'","value":'+String(stt)+'}');
	}
	get_hvac_statestatus(){
		return group_value[this.swt_status_dpt1];
	}


	set_hvac_mode(stt){
		source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.swt_addr_dpt1+'","value":'+String(stt)+'}');
  	}
	get_hvac_mode(){
		return 2;
	}

	set_hvac_setpoint(stt){
		source.set('{"dpt": "9.001","event":"GroupValue_Write","destination":"'+this.temp_addr_dpt9+'","value":'+String(stt)+'}');
	}
	get_hvac_setpoint(){
		return data_convert.convert_dpt9(group_value[this.temp_status_dpt9]);
	}


	set_hvac_fan(stt){
		stt = this.fan_value_set[Math.round(this.fan_value_set.length * (stt/100))];
		if(this.fan_correction_factor == 1){
			source.set('{"dpt": "5.004","event":"GroupValue_Write","destination":"'+this.fan_addr_dpt5+'","value":'+String(stt)+'}');
		}
		else if(this.fan_correction_factor == 2.55){
			source.set('{"dpt": "5.001","event":"GroupValue_Write","destination":"'+this.fan_addr_dpt5+'","value":'+String(stt)+'}');
		}
	}
	get_hvac_fan(){
		var current_speed;
		if(this.fan_correction_factor == 1){
		   current_speed = this.fan_value_set.indexOf(group_value[this.fan_status_dpt5]);
		}
		else{
			current_speed = this.fan_value_set.indexOf(Math.round(group_value[this.fan_status_dpt5]/2.55));
		}

		if(current_speed == -1){
			console.log("Illegal value or group address for fanspeed detected in configuration. Returning Fan Speed as 100%");
			return 100;
		}
		else{
			current_speed  = Math.round(current_speed * (100/this.fan_value_set.length));
			return current_speed;
		}
	}


	get_ac_currentmode(){
		return Math.min(3, group_value[this.swt_status_dpt1]*3);
	}


	 getServices(){
       var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "KNX")
         .setCharacteristic(Characteristic.Model, "HVAC")
         .setCharacteristic(Characteristic.SerialNumber, "KNXHVAC");
       this.HVAC
         .getCharacteristic(Characteristic.Active).onGet(this.get_hvac_statestatus.bind(this)).onSet(this.set_hvac_state.bind(this));
	   this.HVAC
         .getCharacteristic(Characteristic.CurrentHeaterCoolerState).onGet(this.get_ac_currentmode.bind(this))
		 .setProps({
			validValues : [0,3]
           });
	   this.HVAC
         .getCharacteristic(Characteristic.TargetHeaterCoolerState).onGet(this.get_hvac_mode.bind(this)).onSet(this.set_hvac_mode.bind(this))
         .setProps({
			validValues : [2]
           });
      this.HVAC
         .getCharacteristic(Characteristic.CurrentTemperature).onGet(this.get_hvac_setpoint.bind(this))
	     .setProps({
             minValue: this.Minimum_Temperature,
             maxValue: this.Maximum_Temperature,
             minStep: 1
           });
      this.HVAC
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.get_hvac_fan.bind(this)).onSet(this.set_hvac_fan.bind(this))
	     .setProps({
             minValue: 0,
             maxValue: 100,
             minStep: Math.round(100/this.fan_value_set.length)
           });
	  this.HVAC
         .getCharacteristic(Characteristic.CoolingThresholdTemperature).onGet( this.get_hvac_setpoint.bind(this)).onSet(this.set_hvac_setpoint.bind(this)) 
	     .setProps({
			minValue: this.Minimum_Temperature,
			maxValue: this.Maximum_Temperature,
            minStep: 1
           });
    	return [infoService,this.HVAC];
    }

	updatevalue(val,pos){
		if(pos == this.swt_status_dpt1){
		 this.HVAC.getCharacteristic(Characteristic.Active).updateValue(Number(val));
		}
		else if(pos == this.temp_status_dpt9){
		 val = data_convert.convert_dpt9(val);
		 if (val < this.Minimum_Temperature) {
			console.log("Illegal Temperature value detected in Configuration of HVAC. Current value received HVAC Controller for Setpoint:", val);
			this.HVAC.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.Minimum_Temperature);
			this.HVAC.getCharacteristic(Characteristic.CoolingThresholdTemperature).updateValue(this.Minimum_Temperature);
		 }
		 else if (val > this.Maximum_Temperature) {
			console.log("Illegal Temperature value detected in Configuration of HVAC. Current value received HVAC Controller for Setpoint:", val);
			this.HVAC.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.Maximum_Temperature);
			this.HVAC.getCharacteristic(Characteristic.CoolingThresholdTemperature).updateValue(this.Maximum_Temperature);
		 }
		 else {
			this.HVAC.getCharacteristic(Characteristic.CurrentTemperature).updateValue(val);
			this.HVAC.getCharacteristic(Characteristic.CoolingThresholdTemperature).updateValue(val);
		 }
		}
		else if(pos == this.fan_status_dpt5){
			var current_speed;
			if(this.fan_correction_factor == 1){
			   current_speed = this.fan_value_set.indexOf(group_value[this.fan_addr_dpt5]);
			}
			else{
				current_speed = this.fan_value_set.indexOf(Math.round(group_value[this.fan_addr_dpt5]/2.55));
			}

			if(current_speed == -1){
				console.log("Illegal value or group address for fanspeed detected in configuration");
			}
			else{
				current_speed  = Math.round(current_speed * (100/this.fan_value_set.length));
			}
		   this.HVAC.getCharacteristic(Characteristic.RotationSpeed).updateValue(current_speed);
		}
	  }
}


/*
Class for KNX Keypad as Stateless Programmable Switch
*/

class KNX_Stateless_Programmable_Switch{
	constructor(status_dpt17,value_set,name,no){
	  this.status_dpt17 = group_address.indexOf(status_dpt17);
	  this.value_set =  value_set;
	  this.name = "KNXScene-"+name+String(no);
	  this.validvalues = [];
	  for(var i=0; i<this.value_set.length;i++){
		if (this.value_set[i] !== "NA"){
			this.validvalues.push(i);
		}
	  }
	  this.KNX_Stateless_Programmable_Switch = new Service.StatelessProgrammableSwitch(this.name);
	  }

      get_dpt5(){
		var check_val = this.value_set.indexOf(1+ group_value[this.status_dpt17]);
		if (check_val != -1){
			return  check_val;
		}
		else {
			return 0;
		}
	  }
	  getServices(){
		var infoService = new Service.AccessoryInformation();
		  infoService
		   .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
		   .setCharacteristic(Characteristic.Model, "CUEKNXSCENE")
		   .setCharacteristic(Characteristic.SerialNumber, this.name);
		this.KNX_Stateless_Programmable_Switch
		   .getCharacteristic(Characteristic.ProgrammableSwitchEvent).onGet(this.get_dpt5.bind(this))
		   .setProps({
			validValues : this.validvalues
		   })

	   return [infoService,this.KNX_Stateless_Programmable_Switch];
	  }

	  updatevalue(val,pos){

			var check_val = this.value_set.indexOf(val+1);
			if(check_val != -1){
				this.KNX_Stateless_Programmable_Switch.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(check_val);
			}
	  }
}

/*
Class for Lock (Unlock Only) accessory
*/

class KNX_Lock{
		constructor(addr_dpt1,status_dpt1,name,no){
		  this.addr_dpt1 =  addr_dpt1;
		  this.state_lock = group_address.indexOf(status_dpt1);
		  this.name = "KNXLock-"+name+String(no);
		  this.KNX_Lock = new Service.LockMechanism(this.name);
		  }

		  set_dpt1(stt){
		  source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.addr_dpt1+'","value":'+String(1-Number(stt))+'}');
		  }
		  get_dpt1(){
		  return 1-Number(group_value[this.state_lock]);
		  }

		  getServices(){
			var infoService = new Service.AccessoryInformation();
			  infoService
			   .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
			   .setCharacteristic(Characteristic.Model, "CBTCUELOCK")
			   .setCharacteristic(Characteristic.SerialNumber, this.name);
			this.KNX_Lock
			   .getCharacteristic(Characteristic.LockCurrentState).onGet(this.get_dpt1.bind(this))
			   .setProps({
				validValues : [0,1]
			   });
			this.KNX_Lock
			   .getCharacteristic(Characteristic.LockTargetState).onGet(this.get_dpt1.bind(this)).onSet(this.set_dpt1.bind(this));

			return [infoService,this.KNX_Lock];
		  }

			 updatevalue(val,pos){
			  if (pos == this.state_lock){
				  console.log("Updated Requested to Lock",val);
				  this.KNX_Lock.getCharacteristic(Characteristic.LockTargetState).updateValue(1-Number(val));
				  this.KNX_Lock.getCharacteristic(Characteristic.LockCurrentState).updateValue(1-Number(val));
			  }
		  }
}


/*
Class for KNX RGBW
*/

class knxRGBW_6B{
	constructor(addr_dpt1,addr_dpt5,addr_dpt252,status_dpt1,status_dpt5,status_dpt252,name,no){	 
	  this.addr_dpt1 = addr_dpt1;
	  this.addr_dpt5 = addr_dpt5;
	  this.addr_dpt252 = addr_dpt252;
	  this.state_switch = group_address.indexOf(status_dpt1);
	  this.state_dimmer = group_address.indexOf(status_dpt5);
	  this.state_color = group_address.indexOf(status_dpt252);
	  this.name = "KNXRGB-"+name+String(no);
	  this.execute = true;
	  this.knxRGBW_6B = new Service.Lightbulb(this.name);
	  this.hue = 0;
	  this.saturation = 100;
	  this.value = 0;
	}
	  set_dpt1(stt){
		  console.log("Homekit Trigger RGBW");
		  if(this.execute){
			  source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.addr_dpt1+'","value":'+String(stt)+'}');
		  }
	  }
	  get_dpt1(){
		  return group_value[this.state_switch];
	  }

	  set_dpt5(stt){
		  this.execute = false;
		  this.value = stt;
		  this.set_color();
		  setTimeout(() => this.execute = true, 100);
	  }
	  get_dpt5(){
		  return group_value[this.state_dimmer];
	  }

	  set_Hue_dpt5(stt){
		  this.hue = stt;
			 this.set_color();
	   }
	  get_Hue_dpt5(){
		  return 359;
	  }

	  set_Saturation_dpt5(stt){
		  this.saturation = stt
		  this.set_color();
	  }
	  get_Saturation_dpt5(){
		  return 100;
	  }

	  set_color(){
		  console.log(this.hue, this.saturation, this.value);
		  let color = color_convert.hsvToRgb(this.hue, this.saturation, this.value);
		  console.log(color);
		  source.set('{"dpt": "252","event":"GroupValue_Write","destination":"'+this.addr_dpt252+'","value":'+String(color[0])+'}');
    	}

	  getServices(){
		var infoService = new Service.AccessoryInformation();
		  infoService
		   .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
		   .setCharacteristic(Characteristic.Model, "CBTCUEKNXRGB")
		   .setCharacteristic(Characteristic.SerialNumber,  this.name);
		this.knxRGBW_6B
		   .getCharacteristic(Characteristic.On).onGet(this.get_dpt1.bind(this)).onSet(this.set_dpt1.bind(this)); 
		this.knxRGBW_6B
		   .getCharacteristic(Characteristic.Brightness).onGet(this.get_dpt5.bind(this)).onSet(this.set_dpt5.bind(this)); 
		this.knxRGBW_6B
		   .getCharacteristic(Characteristic.Hue).onGet(this.get_Hue_dpt5.bind(this)).onSet(this.set_Hue_dpt5.bind(this));
		this.knxRGBW_6B
		   .getCharacteristic(Characteristic.Saturation).onGet(this.get_Saturation_dpt5.bind(this)).onSet(this.set_Saturation_dpt5.bind(this));

	   return [infoService,this.knxRGBW_6B];
	}
		updatevalue(val,pos){
			if (pos == this.state_switch) {
				this.knxRGBW_6B.getCharacteristic(Characteristic.On).updateValue(val);
			} else if (pos == this.state_dimmer) {
				this.knxRGBW_6B.getCharacteristic(Characteristic.Brightness).updateValue(Math.round(val/2.55));
			} else {
				this.knxRGBW_6B.getCharacteristic(Characteristic.Hue).updateValue(val);
				this.knxRGBW_6B.getCharacteristic(Characteristic.Saturation).updateValue(val);
			}
	    }
}


class KNX_Outlet{
	constructor(addr_dpt1, status_dpt1, name, no, log){
		this.addr_dpt1 =  addr_dpt1;
		this.state_switch = group_address.indexOf(status_dpt1);
		this.name = "Outlet-"+name+String(no);
		this.log = log;
		this.KNX_Outlet = new Service.Outlet(this.name);
	}

	set_On(stt){
		this.log.info('Changing the state of',this.name, ' Outlet to', stt);
	    source.set('{"dpt": "1.001","event":"GroupValue_Write","destination":"'+this.addr_dpt1+'","value":'+String(Number(stt))+'}');
	}
	get_On(){
		this.log.info('Current state of', this.name,' Outlet is:', Boolean(group_value[this.state_switch]));
	    return Boolean(group_value[this.state_switch]);
	}

	getServices(){
		var infoService = new Service.AccessoryInformation();
		  infoService
		   .setCharacteristic(Characteristic.Manufacturer, "Chipbucket Solution Pvt. Ltd")
		   .setCharacteristic(Characteristic.Model, "CBTCUEKNXOutlet")
		   .setCharacteristic(Characteristic.SerialNumber, this.name);
		this.KNX_Outlet
		   .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
	   return [infoService,this.KNX_Outlet];
	}

	updatevalue(val,pos){
		if (pos == this.state_switch) {
			this.log.info('Updating the state of',this.name, ' Outlet to', Boolean(val));
			this.KNX_Outlet.getCharacteristic(Characteristic.On).updateValue(Boolean(val));
	    }
	}
}
