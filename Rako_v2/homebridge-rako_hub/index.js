var Service, Characteristic;
const net = require('net');
let color = require('./lib/color');
const rest =  require("./lib/rest");
const process = require('./lib/json_parser')
var current_state = [];
var device_index = [];
var Room = [];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-rako_hub", "Rako_v2", rako);
}
function rako(log, config)
{
   /* Mandatory Parameters */
   this.ip = config["IP-Address"];
   this.device = config["Device"];
   this.log = log;
}

rako.prototype.accessories = function(callback){

	var results = [];
	const rako_hub_ip = this.ip;
    const log = this.log;
	let client = new net.Socket();

	connectToServer(rako_hub_ip, 9762);

	function connectToServer(serverHost, serverPort) {
		log.info('Establishing connection with RaKo Hub at IP address:', serverHost, 'over port no:', serverPort);
		client.connect(serverPort, serverHost, () => {
        log.info('Connected to RaKo Hub to get the feedback at IP address:', serverHost);
		client.write('SUB,JSON,{"version": 2, "client_name": "CueDesk", "subscriptions": ["TRACKER", "FEEDBACK"] }\r\n');
        setTimeout(() => {
			for (var i=0;i<Room.length;i++){
				client.write(JSON.stringify({"name": "query", "payload": { "queryType": "LEVEL", "roomId": parseInt(Room[i]) }} )+'\r\n');
			}
		}, 10000);
		setInterval(() =>  client.write(JSON.stringify({ "name": "status","payload": {}})+'\r\n'), 999999 )
	});

	 client.on('error', (err) => {
		log.error(`Connection error with RaKo Hub: ${err.message}`);
       // reconnect();
     });

     client.on('close', () => {
         log.warn('Connection closed with RaKo Hub');
         reconnect();
     });

     client.on('data', (string) => {
		string = string.toString();
		string = process.parser(string);
		for (var i=0; i<string.length; i++) {
			try {
				let data = JSON.parse(string[i]);
				if (data.name == "query_LEVEL") {
					log.info('Response received for request "query_LEVEL" ->', JSON.stringify(data));
					for (var i=0; i<data.payload.length; i++){
						 let roomID = data.payload[i].roomId;
						 for (var j=0; j<data.payload[i].channel.length; j++){
							let channelID = data.payload[i].channel[j].channelId;
							let temp_index = device_index.indexOf(roomID+'-'+channelID);
							if (temp_index !== -1) {
								if (data.type == 'level' && typeof current_state[find_device] == 'number') {
									results[temp_index].update_state(data.payload[i].channel[j].currentLevel);
									current_state[temp_index] = data.payload[i].channel[j].currentLevel;
								}
								else if (data.type == 'level' && typeof current_state[find_device] == 'object') {
									results[temp_index].update_state(data.payload[i].channel[j].currentLevel);
									current_state[temp_index][2] = data.payload[i].channel[j].currentLevel;
								}
							}
						 }
					}
				} else if(data.name == "tracker"){
					log.info('Asynchronous response received for "tracker" ->', JSON.stringify(data));
					var find_device = device_index.indexOf(String(data.payload.roomId)+'-'+String(data.payload.channelId));
					if(find_device !== -1){
						if (data.type == 'level' && typeof current_state[find_device] == 'number') {
							results[find_device].update_state(data.payload.targetLevel);
							current_state[find_device] = data.payload.targetLevel;
						}
						else if (data.type == 'color-rgb') {
							let hsv = color.rgbwToHsv(data.payload.rgb[0], data.payload.rgb[1], data.payload.rgb[2], 0);
                            hsv[2] = Math.round(data.payload.level);
							results[find_device].update_state(hsv);
							current_state[find_device] = [hsv[0], hsv[1], hsv[2]];
						}
					}
				}  else if(data.name == "feedback"){
					log.info('Asynchronous response received for "feedback" ->', JSON.stringify(data));
					var find_device = device_index.indexOf(String(data.payload.roomId)+'-'+String(data.payload.channelId));
					if(find_device != -1){
						if (data.type == 'level' && typeof current_state[find_device] == 'number') {
						results[find_device].update_state(data.payload.currentLevel);
						current_state[find_device] = data.payload.currentLevel;
						}
					}
				} else {
					log.info('Asynchronous response received for unknown or undefined ->', JSON.stringify(data));
				}
			   } catch (e){
					log.info('Error processing the feedback:', e);
			   }
		}

     });
    }

  function reconnect() {
    log.info('Reconnecting...');
    setTimeout(() => {
        client.removeAllListeners(); // Remove previous event listeners
        client = new net.Socket(); // Create a new instance of the client
        connectToServer(rako_hub_ip, 9762); // Attempt to reconnect
    }, 3000); // Adjust the timeout as needed
 }

 // Initial connection
  function write(data) {
	client.write(data+'\r\n');
  }

 // tcp_lib.connectToServer(rako_hub_ip, 9762);


	for(var i=0;i<this.device.length;i++){
		var temp_device_locate = this.device[i]["Room-ID"]+'-'+this.device[i]["Channel-ID"];
		if (Room.indexOf(this.device[i]["Room-ID"]) == -1){
			Room.push(this.device[i]["Room-ID"]);
		}
		device_index.push(temp_device_locate);
		switch(this.device[i]['Device-Type']){
			case "Switch":
				results.push(new Rako_Switch(this.device[i]["Room-ID"],  this.device[i]["Channel-ID"],  this.device[i]["Name"], device_index.indexOf(temp_device_locate), this.log, write, rako_hub_ip));
				current_state.push(0);
			break;
			case "Dimmer":
				results.push(new Rako_Dimmer(this.device[i]["Room-ID"],  this.device[i]["Channel-ID"],  this.device[i]["Name"], device_index.indexOf(temp_device_locate), this.log, write, rako_hub_ip));
				current_state.push(0);
			break;
			case "Curtain":
				results.push(new Rako_Curtain(this.device[i]["Room-ID"],  this.device[i]["Channel-ID"],  this.device[i]["Name"], device_index.indexOf(temp_device_locate), this.log, write, rako_hub_ip));
				current_state.push(0);
			break;
			case "RGBW":
				results.push(new Rako_RGBW(this.device[i]["Room-ID"],  this.device[i]["Channel-ID"],  this.device[i]["Name"], device_index.indexOf(temp_device_locate), this.log, write, rako_hub_ip));
				current_state.push([0,0,0]);
			break;
			case "CCT":
				results.push(new Rako_CCT(this.device[i]["Room-ID"],  this.device[i]["Channel-ID"],  this.device[i]["Name"], device_index.indexOf(temp_device_locate), this.log, write, rako_hub_ip));
				current_state.push([0,0]);
			break;
			default:
				this.log.warn('No valid device type found');
		}
    }
 callback(results)
}

/*
Class for Rako non-dimmable lights
*/
class Rako_Switch{
	constructor(room,channel,name,index,log, write, ip){
	this.room = parseInt(room);
	this.channel = parseInt(channel);
	this.name =  name;
	this.index = index;
	this.log = log;
	this.write = write;
	this.ip = ip;
	this.Rako_Switch = new Service.Switch(this.name);
	}

	set_On(stt){
	 this.log.info('Changing the state of', this.name, 'to ->',stt);
	 stt = Number(stt)*255;
	 var url = "/rako.cgi?room="+String(this.room)+"&ch="+String(this.channel)+"&lev="+stt.toString();
	 rest.set(url,this.ip);
	// let json_obj = { "name": "send", "payload": { "room": this.room, "channel": this.channel, "action": { "command": "levelrate", "level": stt } } }
	// tcp_lib.send_data(JSON.stringify(json_obj));
	// this.write(JSON.stringify(json_obj))
	}

    get_On(){
         return Boolean(current_state[this.index]);
    }
	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Rako COntrols")
         .setCharacteristic(Characteristic.Model, "Rako_Switch")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.Rako_Switch
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
	   return [infoService,this.Rako_Switch];
    }

	update_state(cs){
		this.log.info('Request to update the state of', this.name, 'to ->',cs, );
		this.Rako_Switch.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
    }
}


/*
Class for Rako dimmable lights
*/
class Rako_Dimmer{
	constructor(room, channel, name, index, log, write, ip){
	this.room = parseInt(room);
	this.channel = parseInt(channel);
	this.name =  name;
	this.index = index;
	this.log = log;
	this.write = write;
	this.ip = ip;
	this.Rako_Dimmer = new Service.Lightbulb(this.name);
	this.last_brightness = 100;
	}

	set_On(stt){
		this.log.info('Changing the state of', this.name, 'to ->',stt, );
		setTimeout(() => {
			if(stt && current_state[this.index] == 0){
				stt = 255;
			}
			else if(stt && current_state[this.index] !== 0 ){
				stt = current_state[this.index];
			}
			else {
				stt = 0;
			}
			var url = "/rako.cgi?room="+String(this.room)+"&ch="+String(this.channel)+"&lev="+stt.toString();
			rest.set(url,this.ip);

		} ,200);
	}
    get_On(){
		return Boolean(current_state[this.index]);
   	}

	set_Brightness(stt){
		this.log.info('Changing the brightness value of', this.name, 'to ->',stt);
		stt = Math.ceil(stt*2.55);
		this.execute = false;
		current_state[this.index] = stt;
		/*let json_obj = { "name": "send", "payload": { "room": this.room, "channel": this.channel, "action": { "command": "levelrate", "level": stt } } }
		this.write(JSON.stringify(json_obj));*/
		var url = "/rako.cgi?room="+String(this.room)+"&ch="+String(this.channel)+"&lev="+stt.toString();
	    rest.set(url,this.ip);
		setTimeout(() => this.execute = true,3000);
	}
	get_Brightness(){
		return Math.floor(current_state[this.index]/2.55);
	}

	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Rako Controls")
         .setCharacteristic(Characteristic.Model, "RakoDimmer")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.Rako_Dimmer
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
	  this.Rako_Dimmer
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_Brightness.bind(this)).onSet(this.set_Brightness.bind(this)); 	 
	 return [infoService,this.Rako_Dimmer];
    }

	update_state(cs){
		this.log.info('Request to update the state of', this.name, 'to ->',cs, );
		this.Rako_Dimmer.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
		if (this.execute){
			this.Rako_Dimmer.getCharacteristic(Characteristic.Brightness).updateValue(Math.floor(cs/2.55));
		} else if (current_state[this.index] == cs){
			this.Rako_Dimmer.getCharacteristic(Characteristic.Brightness).updateValue(Math.floor(cs/2.55));
		}
    }
}


/*
Class for Rako Curtains
*/
class Rako_Curtain{
	constructor(room, channel, name, index, log, write, ip){
		this.room = parseInt(room);
		this.channel = parseInt(channel);
		this.name =  name;
		this.index = index;
		this.write = write;
		this.log = log;
		this.ip = ip;
		this.Rako_Curtain = new Service.WindowCovering(this.name);
	}

	set_TargetPosition(stt){
		stt = Math.ceil(stt*2.55);
		/*let json_obj = { "name": "send", "payload": { "room": this.room, "channel": this.channel, "action": { "command": "levelrate", "level": stt } } }
		this.write(JSON.stringify(json_obj));*/
		var url = "/rako.cgi?room="+String(this.room)+"&ch="+String(this.channel)+"&lev="+stt.toString();
	    rest.set(url,this.ip);
	}
    get_TargetPosition(){
        return Math.floor(current_state[this.index]/2.55);
    }

	get_CurrentPosition(){
        return Math.floor(current_state[this.index]/2.55);
	}

    get_PositionState(){
	   return 2;
    }

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Rako Controls")
         .setCharacteristic(Characteristic.Model, "RakoCurtain")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.Rako_Curtain
         .getCharacteristic(Characteristic.TargetPosition).onSet(this.set_TargetPosition.bind(this)).onGet(this.get_TargetPosition.bind(this));
	   this.Rako_Curtain
         .getCharacteristic(Characteristic.CurrentPosition).onGet(this.get_CurrentPosition.bind(this));
	   this.Rako_Curtain
         .getCharacteristic(Characteristic.PositionState).onGet(this.get_PositionState.bind(this));

	 return [infoService,this.Rako_Curtain];
    }

	update_state(cs){
		this.Rako_Curtain.getCharacteristic(Characteristic.TargetPosition).updateValue(Math.floor(cs/2.55));
		this.Rako_Curtain.getCharacteristic(Characteristic.CurrentPosition).updateValue(Math.floor(cs/2.55));
    }
}


/*
Class for Rako CCT lights
*/
class Rako_CCT{
	constructor(room, channel, name, index, log, write, ip){
		this.room = parseInt(room);
		this.channel = parseInt(channel);
		this.name =  name;
		this.index = index;
		this.log = log;
		this.write = write;
		this.ip = ip;
	    this.Rako_CCT = new Service.Lightbulb(this.name);
		this.brightness = 100;
	}

	set_On(stt){

		setTimeout(() => {
			if(stt && current_state[this.index] == 0){
				stt = stt*255;
			}
			else if(stt && current_state[this.index] !== 0 ){
				stt = current_state[this.index];
			}
			else {
				stt = 0;
			}

			var url = "/rako.cgi?room="+String(this.room)+"&ch="+String(this.channel)+"&lev="+stt.toString();
			rest.set(url,this.ip);
		}, 500);
    }
    get_On(){
        return Boolean(current_state[this.index]);
   	}

	set_Brightness(stt){

		this.brightness = stt;
		stt = Math.floor(stt*2.55);
		current_state[this.index] = stt;
		var url = "/rako.cgi?room="+String(this.room)+"&ch="+String(this.channel)+"&lev="+stt.toString();
	    rest.set(url,this.ip);
	}
	get_Brightness(){
		return Math.floor(current_state[this.index]/2.55);
	}

	set_ColorTemperature(stt){
		stt = Math.floor(1000000/stt);
		let json_obj = { "name": "send-colorTemp", "payload": { "room": this.room, "channel": this.channel, "temperature": stt, "brightness": 100 }}
        this.log.info('CT command:',json_obj);
		this.write(JSON.stringify(json_obj));
	}
	get_ColorTemperature() {

	}

	getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Rako Controls")
         .setCharacteristic(Characteristic.Model, "RakoCCT")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
      this.Rako_CCT
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
	  this.Rako_CCT
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_Brightness.bind(this)).onSet(this.set_Brightness.bind(this));
	  this.Rako_CCT
         .getCharacteristic(Characteristic.ColorTemperature).onGet(this.get_ColorTemperature.bind(this)).onSet(this.set_ColorTemperature.bind(this))
         .setProps({
			minValue: 143,
			maxValue: 370,
			minStep: 1
		  });
		 return [infoService,this.Rako_CCT];
    }

	update_state(cs){
		this.Rako_CCT.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
		this.Rako_CCT.getCharacteristic(Characteristic.Brightness).updateValue(Math.floor(cs/2.55));
		this.brightness = Math.floor(cs/2.55);
    }
}


/*
Class for Rako CCT lights
*/
class Rako_RGBW{
	constructor(room, channel, name, index, log, write, ip){
		this.room = parseInt(room);
		this.channel = parseInt(channel);
		this.name =  name;
		this.index = index;
		this.log = log;
		this.write = write;
		this.ip = ip;
	    this.Rako_RGBW = new Service.Lightbulb(this.name);
		this.hue = 0;
		this.saturation = 100;
		this.value = 100;
		this.execute = true;
	}

	set_On(stt){
		this.log.info('Changing the state of', this.name, 'to ->',stt, );
		if (stt) {
			if (this.value == 0){
				this.value = 100;
			}
			let json_obj = { "name": "send", "payload": { "room": this.room, "channel": this.channel, "action": { "command": "levelrate", "level": 100 } } };
		    this.write(JSON.stringify(json_obj));
			this.set_Color();
		}
		else {
			let json_obj = { "name": "send", "payload": { "room": this.room, "channel": this.channel, "action": { "command": "levelrate", "level": 0 } } }
		    this.write(JSON.stringify(json_obj));
			this.value = 0;
			this.set_Color();
		}

    }
    get_On(){
        return Boolean(current_state[this.index][2]);
   	}

	set_Brightness(stt){
		this.value = stt;
		current_state[this.index][2] = Math.floor(stt*2.55);
		this.set_Color();
	}
	get_Brightness(){
        return Math.floor(current_state[this.index][2]/2.55);
	}

	set_Hue(stt){
		current_state[this.index][0] = stt;
		this.hue = stt;
		this.set_Color();
	}
	get_Hue(){
        return current_state[this.index][0];
	}

	set_Saturation(stt){
		current_state[this.index][1] = stt;
		this.saturation = stt;
		this.set_Color();
	}
    get_Saturation(){
        return Math.floor(current_state[this.index][1]/2.55);
	}

	set_Color(){
		if(this.execute){
			this.execute = false;
			setTimeout(() => {
				var set_response = color.hsvToRgb(this.hue, this.saturation, this.value);
				this.log("RGB Current state:", current_state[this.index], this.hue, this.saturation, this.value);
				this.log.info('Response from color:',set_response);
				let json_obj = { "name": "send-color", "payload": {"room": this.room, "channel": this.channel, "red": set_response[0], "green": set_response[1], "blue": set_response[2] } }
				this.log.info('Command send from RGB', JSON.stringify(json_obj));
				this.write(JSON.stringify(json_obj));
			}, 1200);
			setTimeout(() => this.execute = true, 2000);
		}
	}

	getServices(){
		var infoService = new Service.AccessoryInformation();
		infoService
         .setCharacteristic(Characteristic.Manufacturer, "Rako Controls")
         .setCharacteristic(Characteristic.Model, "RakoRGBW")
         .setCharacteristic(Characteristic.SerialNumber, this.serial);
		 this.Rako_RGBW
		 .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
		 this.Rako_RGBW
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_Brightness.bind(this)).onSet(this.set_Brightness.bind(this));
		 this.Rako_RGBW
         .getCharacteristic(Characteristic.Hue).onGet(this.get_Hue.bind(this)).onSet(this.set_Hue.bind(this));
		 this.Rako_RGBW
         .getCharacteristic(Characteristic.Saturation).onGet(this.get_Saturation.bind(this)).onSet(this.set_Saturation.bind(this));

		 return [infoService,this.Rako_RGBW];
    }

	update_state(cs){
		if (typeof cs == 'number') {
			this.Rako_RGBW.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
		} else if (typeof cs == 'object') {
			this.hue = cs[0];
			this.saturation = cs[1];
			this.value = Math.round(cs[2]/2.55);
			this.Rako_RGBW.getCharacteristic(Characteristic.Hue).updateValue(Math.floor(cs[0]));
			this.Rako_RGBW.getCharacteristic(Characteristic.Saturation).updateValue(Math.floor(cs[1]));
			this.Rako_RGBW.getCharacteristic(Characteristic.Brightness).updateValue(Math.floor(Math.round(cs[2]/2.55)));
		}
    }
}