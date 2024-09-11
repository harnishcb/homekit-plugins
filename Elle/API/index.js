var Service, Characteristic;
const mqtt = require("mqtt");


module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-elle", "elle_Cue", elle);
}

function elle(log, config)
{
   this.log = log;
}

elle.prototype.accessories = function(callback){
    var log = this.log;
    var results = [];   
    client.on("connect", () => {
        client.subscribe("presence", (err) => {
          if (!err) {
            client.publish("presence", "Hello mqtt");
          } 
        });
      });
    callback(results)
}

class elle_Switch{
    constructor(name, log, mac, addr, index){
        this.mac = mac
        this.addr = addr;
        this.log = log;
        this.name = name;
        this.index = index;
        this.elle_Switch = new Service.Switch(this.name);
    }
    set_On(stt){
        this.log.info(`Triggering the Switch: ${this.name} associated with HDL Address: ${this.addr} for changing state to: ${Number(stt)}`);
        const mqttTopic = `REEVA/BLE_MESH_GATEWAY/${this.mac}/C/1`;
        const mqttMessage = JSON.stringify({ addr: this.addr, type: "onoff", onoff: Number(stt) });
        
        this.client.publish(mqttTopic, mqttMessage, (err) => {
            if (err) {
                this.log.error(`Error publishing MQTT message: ${err}`);
            } else {
                this.log.info(`Published MQTT message to topic ${mqttTopic}: ${mqttMessage}`);
            }
        });
    }
    get_On(){
        this.log.info(`Requesting current state for the Switch: ${this.name} associated with HDL Address: ${this.addr}`);
        const currentState = false; 
        return currentState;
    }
    getServices(){
        const infoService = new Service.AccessoryInformation();
        infoService
            .setCharacteristic(Characteristic.Manufacturer, "HDL Pro Controls")
            .setCharacteristic(Characteristic.Model, "elle_Switch")
            .setCharacteristic(Characteristic.SerialNumber, `${this.addr} : ${this.mac}`);

        this.elle_Switch
            .getCharacteristic(Characteristic.On)
            .on('get', this.get_On.bind(this))
            .on('set', this.set_On.bind(this));

        return [infoService, this.elle_Switch];
    }
    update_state(cs){
        this.elle_Switch
            .getCharacteristic(Characteristic.On)
            .updateValue(Boolean(cs));
    }
}

class elle_Dimmer {
    constructor(name, log, mac, addr, index) {
        this.mac = mac;
        this.addr = addr;
        this.log = log;
        this.name = name;
        this.index = index;
        this.elle_Dimmer = new Service.Lightbulb(this.name);
        this.last_brightness = 0; // Initialize last brightness
    }

    set_On(stt) {
        // Your existing set_On method logic
        // Assuming sent.set_data(this.addr, Number(stt)) is your custom method for setting state
        this.log.info(`Triggering the Dimmer: ${this.name} associated with HDL Address: ${this.addr} for changing state to: ${Number(stt)}`);
        const mqttTopic = `REEVA/BLE_MESH_GATEWAY/${this.mac}/C/1`;
        const mqttMessage = JSON.stringify({ addr: this.addr, type: "lightness", lightness: 100 });
        this.client.publish(mqttTopic, mqttMessage, (err) => {
            if (err) {
                this.log.error(`Error publishing MQTT message: ${err}`);
            } else {
                this.log.info(`Published MQTT message to topic ${mqttTopic}: ${mqttMessage}`);
            }
        });
        sent.set_data(this.addr, Number(stt));
    }
    get_On() {
        // Your existing get_On method logic
        // Assuming current_state[this.index] holds the current state
        this.log.info(`Requesting current state for the Switch: ${this.name} associated with HDL Address: ${this.addr}`);
        const currentState = false; 
        return currentState;
    }

    set_Brightness(stt) {
        this.log.info("Triggering the Dimmer value:", this.name ,"associated with HDL Address:", this.HDL_addr,"for changing state to:",Number(stt));
        this.dimmer_trigger = false;
        sent.set_data(this.HDL_addr, Number(stt));
        if (Number(stt) > 0){
            this.last_brightness_value = Number(stt);
        }
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

    getServices() {
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

    update_state(cs) {
        if (cs >= 0 || cs <= 100) {
            this.log.info(`Valid feedback received and updated for Dimmer: ${this.name} associated with HDL address: ${this.addr} with current state: ${cs / 100}`);
            this.elle_Dimmer.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
            if (!this.dimmer_trigger){
                setTimeout(() => this.HDL_Dimmer.getCharacteristic(Characteristic.Brightness).updateValue(Number(cs)), 2000) ;
                if (Number(cs) > 0){
                 this.last_brightness_value = Number(cs);
                }
             } 
        } else {
            this.log.warn(`Invalid feedback received for the Dimmer: ${this.name} associated with HDL address: ${this.addr} with current state: ${cs}. Valid numbers are 0 or 100 only`);
        }
    }
}

class elle_CCT {
    constructor(name, log, HDL_addr, device_index, area, channel) {
        this.name = name;
        this.log = log;
        this.HDL_addr = HDL_addr;
        this.device_index = device_index;
        this.area = area;
        this.channel = channel;
        this.elle_CCT = new Service.Lightbulb(this.name);
    }
    set_On(stt) {
        this.log.info(`Triggering the CCT: ${this.name} associated with HDL address ${this.HDL_addr} for changing state to: ${Number(stt)}`);
        const mqttTopic = `REEVA/BLE_MESH_GATEWAY/${this.mac}/C/1`;
        const mqttMessage = JSON.stringify({ addr: this.addr, type: "ctl", lightness: 100, temperature: 800, trans_time: 60, profile_type: 1, is_preset: 1});
        this.client.publish(mqttTopic, mqttMessage, (err) => {
            if (err) {
                this.log.error(`Error publishing MQTT message: ${err}`);
            } else {
                this.log.info(`Published MQTT message to topic ${mqttTopic}: ${mqttMessage}`);
            }
        });       
    }
    get_On() {
        this.log.info(`Requesting current state for the CCT: ${this.name} associated with HDL Address: ${this.addr}`);
        const currentState = false; 
        return currentState;
    }

    set_Brightness(stt) {
        this.log.info("Triggering the CCT value:", this.name ,"associated with HDL Address:", this.HDL_addr,"for changing state to:",Number(stt));
        this.dimmer_trigger = false;
        sent.set_data(this.HDL_addr, Number(stt));
        if (Number(stt) > 0){
            this.last_brightness_value = Number(stt);
        }
    }

    get_Brightness() {
        this.log.info("Requesting current value for the CCT:", this.name ,"associated with HDL Address:", this.HDL_addr,"........received :",current_state[this.device_index]);
        if (Number(current_state[this.device_index]) >= 0 && Number(current_state[this.device_index]) <= 100){
            return Number(current_state[this.device_index]);
        }
        else {
            this.log.warn("Received invalid value for CCT:", current_state[this.device_index], "Returning default value:0");
            return 0;
        }
    }

    set_ColorTemperature(stt) {
        this.log.info("Triggering the CCT Color Temperature:", this.name ,"associated with HDL Address:", this.HDL_addr,"for changing state to:",Number(stt));
    }

    get_ColorTemperature() {}
    
    getServices(){
        var infoService = new Service.AccessoryInformation();
            infoService
            .setCharacteristic(Characteristic.Manufacturer, "HDL Pro Controls")
            .setCharacteristic(Characteristic.Model, "HDLPro-CCT")
            .setCharacteristic(Characteristic.SerialNumber, this.HDL_addr);
        this.HDL_CCT
            .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
        this.HDL_CCT
            .getCharacteristic(Characteristic.Brightness).onGet(this.get_Brightness.bind(this)).onSet(this.set_Brightness.bind(this));
        this.HDL_CCT
            .getCharacteristic(Characteristic.ColorTemperature).onGet(this.get_ColorTemperature.bind(this)).onSet(this.set_ColorTemperature.bind(this));
    
        return [infoService,this.HDL_CCT];
    }

    update_state(cs) {
        if (cs >= 0 && cs <= 100){
            this.log.info("Valid feedback received and updated for CCT:", this.name, "associated with HDL address:", this.HDL_addr, "with current state:", cs/100);
            this.HDL_CCT.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
            if (!this.dimmer_trigger){
               setTimeout(() => this.HDL_CCT.getCharacteristic(Characteristic.Brightness).updateValue(Number(cs)), 2000) ;
               if (Number(cs) > 0){
                this.last_brightness_value = Number(cs);
               }
            }
        } else {
            this.log.warn(`Invalid feedback received for CCT: ${this.name} associated with HDL address: ${this.HDL_addr} with current state: ${cs}. Valid numbers are 0 or 100 only`);
        }
    }
}

class elle_RGBW {
    constructor(name, log, HDL_addr) {
        this.name = name;
        this.log = log;
        this.HDL_addr = HDL_addr;
        this.hue = 0; // Initialize hue (0-360)
        this.saturation = 100; // Initialize saturation (0-100)
        this.lightness = 0; // Initialize lightness (0-100)
        this.value =100;
        this.elle_RGBW = new Service.Lightbulb(this.name);

    }
    set_On(stt) {
        this.log.info(`Triggering the RGBW: ${this.name} associated with HDL Address: ${this.HDL_addr} for changing state to: ${Number(stt)}`);
        const mqttTopic = `REEVA/BLE_MESH_GATEWAY/${this.mac}/C/1`;
        const mqttMessage = JSON.stringify({ addr: this.addr, lightness: 255, hue: 255, saturation: 255 });
        client.on('message', (topic, message) => {
            if (topic === this.mqttTopic) {
                try {
                    const msg = JSON.parse(message);
                    this.processMessage(msg);
                } catch (error) {
                    this.log.error(`Error parsing MQTT message: ${error.message}`);
                }
            }
        });
        sent.set_data(this.HDL_addr, Number(stt));
    }
    
    get_On() {
        return Boolean(current_state[this.index][2]);
    }

    set_Brightness(stt) {
        this.value = stt;
		current_state[this.index][2] = Math.floor(stt*2.55);
		this.set_Color();
    }

    get_Brightness() {
        return Math.floor(current_state[this.index][2]/2.55);
    }

    set_hue(hue) {
        current_state[this.index][0] = stt;
		this.hue = stt;
		this.set_Color();
    }

    get_hue() {
        return current_state[this.index][0];
    }

    set_Saturation(saturation) {
        current_state[this.index][1] = stt;
		this.saturation = stt;
		this.set_Color();
    }

    get_Saturation() {
        return Math.floor(current_state[this.index][1]/2.55);
    }

    set_Color(hue, saturation, lightness) {
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

    getServices() {
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

    update_state(cs) {
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
