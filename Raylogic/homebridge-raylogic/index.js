var Service, Characteristic;
const net = require('net');

let current_state = [];
let uuid =[];

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-raylogic", "Raylogic", raylogic);
}

function raylogic(log, config)
{
   /* Mandatory Parameters */
   this.ip = config['IP-Address'];
   this.devices = config['devices'];
   /* Logs */
   this.log = log;
}

raylogic.prototype.accessories = function(callback){
    var log = this.log;
	var results = [];

    /**
    * TCP client to connect to Raylogic
    */

    const SERVER_PORT = 5050;
    const SERVER_HOST = this.ip;
    let client = new net.Socket();;

    client.connect(SERVER_PORT, SERVER_HOST, () => {
        console.log('Connected to server');
        client.write('*KA=01\r');
        setInterval(() => client.write('*KA=01\r'), 10000);
    });

    client.on('data', (data) => {
        data = data.toString();
        log.info('Data received from Raylogic server: ' + data);
        if (data.length >= 12){
            data = data.replace(/ /g, '');
            let cmd_type = data.slice(6,8);
            if (cmd_type == "1A") {
                let Area = data.slice(8,10);
                let Channel = data.slice(12,14);
                let level = data.slice(10,12);
                let index = uuid.indexOf(Area+'-'+Channel);
                if (index !== -1){
                    results[index].update_state(parseInt(level, 16));
                    current_state[index] = parseInt(level, 16);
                }
            } else if (cmd_type == "27") {
                let Area = 'CC';
                let Channel = data.slice(8,10);
                let level = data.slice(10,12);
                let index = uuid.indexOf(Area+'-'+Channel);
                if (index !== -1){
                    results[index].update_state(parseInt(level, 16));
                    current_state[index] = parseInt(level, 16);
                }
            }
        }
    });

    client.on('close', () => {
        console.log('Connection closed');
    });

    client.on('error', (err) => {
        console.error('Connection error: ' + err.message);
        client.connect(SERVER_PORT, SERVER_HOST);
    });


    function write(data){
        client.write(data);
    }


/**
 * Declare devices and launch
 */
    for (var i=0; i<this.devices.length; i++) {
        let area;
        let channel;
        if (this.devices[i]['Device-Type'] == "Curtain") {
            area = 'CC';
            channel = ('00'+Math.ceil(parseInt(this.devices[i].Channel)/2).toString(16)).slice(-2);
            uuid.push(area+'-'+channel);
            channel = ('00'+this.devices[i].Channel.toString(16)).slice(-2);

        } else {
            area = ('00'+this.devices[i].Area.toString(16)).slice(-2);
            channel = ('00'+this.devices[i].Channel.toString(16)).slice(-2);
            uuid.push(area+'-'+channel);
        }

        switch(this.devices[i]['Device-Type']) {
            case 'Switch':
                current_state.push(1);
                results.push(new Raylogic_Switch(this.devices[i].Name, area, channel, write, uuid.length-1,log));
            break;

            case 'Dimmer':
                current_state.push(255);
                results.push(new Raylogic_Dimmer(this.devices[i].Name, area, channel, write, uuid.length-1,log));
            break;

            case 'Fan':
                current_state.push(1);
                results.push(new Raylogic_Fan(this.devices[i].Name, area, channel, write, uuid.length-1,log));
            break;

            case 'Curtain':
                current_state.push(100);
                results.push(new Raylogic_Curtain(this.devices[i].Name, area, channel, write, uuid.length-1,log));
            break;
        }
    }
    callback(results)
}

/**
 * Raylogic_Switch to Define the Dimmer Accessory
 * getServices method to declare the characteristics of the accessory
 * set_On , get_On method link to characteristics On
 * set_On method is invoked when Homekit changes the characteristics with latest value in parameter i.e. Operated from homekit
 * get_On method is invoked when Homekit expects the current state of the characteristics
 *
 */

class Raylogic_Switch{
	constructor(name, area, channel, write, index, log){
        this.name = name;
        this.area = area;
        this.channel = channel;
        this.write = write;
        this.index = index;
        this.log = log;
        this.Raylogic_Switch = new Service.Switch(this.name);
	}

    /**
     * Method to Trigger Switch when Requested from Apple Home
     * Command Structure = Command Origin + Unused + Function Type (Constant) + Area + Value + Channel + CarriageReturn;
     * Length of Command = 4 byte + 2 byte + 2 byte +2 byte + 2 byte + 2 byte
     * Value for Turning On  = 02;
     * Value for Turning Off = 01;
     * Sample Command from Area 01, Channel 01 & Switch off - *AR=001A010101 + CarriageReturn;
     * Sample Command from Area 01, Channel 01 & Switch on - *AR=001A010201 + CarriageReturn
     */
	set_On(stt){
        this.log.info("Triggering the Switch:", this.name ,"associated with Area and Channel:", this.area,'&',this.channel,"for changing state to:",Number(stt));
        let cmd_data = '*AR=001A'+this.area+'0'+String(Number(stt)+1)+this.channel+'\r'
        this.write(cmd_data);
	}
    get_On(){
        this.log.info("Requesting current state for the Switch:", "this.name Area and Channel:", this.area,'&',this.channel,"........received :",current_state[this.index]);
        return Boolean(current_state[this.index]-1);
    }

	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Raylogic")
         .setCharacteristic(Characteristic.Model, "Raylogic-Switch")
         .setCharacteristic(Characteristic.SerialNumber, this.area+this.channel);
      this.Raylogic_Switch
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));

      return [infoService,this.Raylogic_Switch];
     }

	update_state(cs){
        if (cs == 1 || cs == 2){
            this.log.info("Valid feedback received and updated for Switch:", this.name, "associated with Area-Channel:", this.area,this.channel, "with current state:", cs);
            this.Raylogic_Switch.getCharacteristic(Characteristic.On).updateValue(Boolean(1-cs));
        }
        else {
            this.log.warn("Invalid feedback received for the Switch:", this.name, "associated with Area-Channel:", this.area,this.channel, "with current state:", cs, ". Valid numbers are 1 or 2 only");
        }
    }
}


/**
 * Raylogic_Dimmer to Define the Dimmer Accessory
 * getServices method to declare the characteristics of the accessory
 * set_On , get_On method link to characteristics On
 * set_On method is invoked when Homekit changes the characteristics with latest value in parameter i.e. Operated from homekit
 * get_On method is invoked when Homekit expects the current state of the characteristics
 *
 * set_Brightness , get_Brightness method link to characteristics Brightness
 * set_Brightness method is invoked when Homekit changes the characteristics with latest value in parameter i.e. Operated from homekit
 * get_Brightness method is invoked when Homekit expects the current state of the characteristics
 *
 */

class Raylogic_Dimmer{
	constructor(name, area, channel, write, index, log){
        this.name = name;
        this.area = area;
        this.channel = channel;
        this.write = write;
        this.index = index;
        this.log = log;
        this.Raylogic_Dimmer = new Service.Lightbulb(this.name);
        this.last_brightness = 100;
	}

    /**
     * Method to Trigger Dimmer when Requested from Apple Home
     * Command Structure = Command Origin + Unused + Function Type (Constant) + Area + Value + Channel + CarriageReturn;
     * Length of Command = 4 byte + 2 byte + 2 byte +2 byte + 2 byte + 2 byte
     * Value for Turning 100%  = 01
     * Value for Turning Off  = FF
     * Dimming - FF (0%) to 01 (100%)
     * Sample Command from Area 01, Channel 01 & Switch off - *AR=001A01FF01 + CarriageReturn;
     * Sample Command from Area 01, Channel 01 & Switch on (100%) - *AR=001A010101 + CarriageReturn
     */
	set_On(stt){
        this.log.info("Triggering the Dimmer:", this.name ,"associated with Area and Channel:", this.area,'&',this.channel,"for changing state to:",Number(stt));
        let cmd_data
        if (stt) {
            cmd_data = '*AR=001A'+this.area+'00'+String(Number(stt)+1)+this.channel+'\r';
        } else {
            cmd_data = '*AR=001A'+this.area+'FF'+this.channel+'\r';
        }
        this.write(cmd_data);
	}
    get_On(){
        this.log.info("Requesting current state for the Dimmer:", "this.name Area and Channel:", this.area,'&',this.channel,"........received :",current_state[this.index]);
        return Boolean(255-current_state[this.index]);
    }

    set_Brightness(stt){
        if (stt > 0) {
            this.last_brightness = stt;
        }
        this.log.info("Triggering the Dimmer:", this.name ,"associated with Area and Channel:", this.area,'&',this.channel,"for changing state to:",Number(stt));
        let cmd_data = '*AR=001A'+this.area+('00'+ (Math.max(255- Math.round(stt*2.55) , 1)).toString(16)).slice(-2)+this.channel+'\r'
        this.write(cmd_data);
	}
    get_Brightness(){
        this.log.info("Requesting current state for the Dimmer:", "this.name Area and Channel:", this.area,'&',this.channel,"........received :",current_state[this.index]);
        return Math.ceil((255-current_state[this.index])/2.55);
    }
	 getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Raylogic")
         .setCharacteristic(Characteristic.Model, "Raylogic-Dimmer")
         .setCharacteristic(Characteristic.SerialNumber, this.area+this.channel);
         this.Raylogic_Dimmer
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
         this.Raylogic_Dimmer
         .getCharacteristic(Characteristic.Brightness).onGet(this.get_Brightness.bind(this)).onSet(this.set_Brightness.bind(this));

      return [infoService,this.Raylogic_Dimmer];
     }

	update_state(cs){
        if (cs > 0 || cs < 255){
            if (cs < 255) {
                this.last_brightness = Math.ceil((255-cs)/2.55);
            }
            this.log.info("Valid feedback received and updated for Switch:", this.name, "associated with Area-Channel:", this.area,this.channel, "with current state:", cs);
            this.Raylogic_Dimmer.getCharacteristic(Characteristic.On).updateValue(Boolean(255-cs));
            this.Raylogic_Dimmer.getCharacteristic(Characteristic.Brightness).updateValue(Math.ceil((255-cs)/2.55));
        }
        else {
            this.log.warn("Invalid feedback received for the Switch:", this.name, "associated with Area-Channel:", this.area,this.channel, "with current state:", cs, ". Valid numbers are 1 to 255 only");
        }
    }
}

/**
 * Raylogic_Fan to Define the Fan Accessory
 * getServices method to declare the characteristics of the accessory
 * set_On , get_On method link to characteristics On
 * set_On method is invoked when Homekit changes the characteristics with latest value in parameter i.e. Operated from homekit
 * get_On method is invoked when Homekit expects the current state of the characteristics
 *
 * set_RotationSpeed , get_RotationSpeed method link to characteristics Rotation Speed
 * set_RotationSpeed method is invoked when Homekit changes the characteristics with latest value in parameter i.e. Operated from homekit
 * get_RotationSpeed method is invoked when Homekit expects the current state of the characteristics
 *
 */
class Raylogic_Fan{
	constructor(name, area, channel, write, index, log){
        this.name = name;
        this.area = area;
        this.channel = channel;
        this.write = write;
        this.index = index;
        this.log = log;
        this.Raylogic_Fan = new Service.Fan(this.name);
        this.last_RotationSpeed = 100;
	}


    /**
     * Method to Trigger Fan when Requested from Apple Home
     * Command Structure = Command Origin + Unused + Function Type (Constant) + Area + Value + Channel + CarriageReturn;
     * Length of Command = 4 byte + 2 byte + 2 byte +2 byte + 2 byte + 2 byte
     * Value for Step 4 = 05
     * Value for Turning Off  = 01
     * Dimming - 05 (Step-4) to 01 (Off)
     * Sample Command from Area 01, Channel 01 & Switch off - *AR=001A010101 + CarriageReturn;
     * Sample Command from Area 01, Channel 01 & Switch on (100%) - *AR=001A010501 + CarriageReturn
     */
	set_On(stt){
        this.log.info("Triggering the Fan:", this.name ,"associated with Area and Channel:", this.area,'&',this.channel,"for changing state to:",Number(stt));
        let cmd_data = '*AR=001A'+this.area+('00'+(1+(stt/25)).toString(16)).slice(-2)+this.channel+'\r';
        this.write(cmd_data);
	}
    get_On(){
        this.log.info("Requesting current state for the Fan:", "this.name Area and Channel:", this.area,'&',this.channel,"........received :",current_state[this.index]);
        return Boolean(current_state[this.index]-1);
    }

    set_RotationSpeed(stt){
        if (stt > 0) {
            this.last_RotationSpeed = stt;
        }
        this.log.info("Triggering the Fan:", this.name ,"associated with Area and Channel:", this.area,'&',this.channel,"for changing state to:",Number(stt));
        let cmd_data = '*AR=001A'+this.area+('00'+ (1+(stt/25)).toString(16)).slice(-2)+this.channel+'\r'
        this.write(cmd_data);
	}
    get_RotationSpeed(){
        this.log.info("Requesting current state for the Fan:", "this.name Area and Channel:", this.area,'&',this.channel,"........received :",current_state[this.index]);
        return Math.ceil((current_state[this.index]-1) * 25);
    }

    getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Raylogic")
         .setCharacteristic(Characteristic.Model, "Raylogic-Fan")
         .setCharacteristic(Characteristic.SerialNumber, this.area+this.channel);
         this.Raylogic_Fan
         .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
         this.Raylogic_Fan
         .getCharacteristic(Characteristic.RotationSpeed).onGet(this.get_RotationSpeed.bind(this)).onSet(this.set_RotationSpeed.bind(this))
         .setProps({
            minValue: 0,
            maxValue: 100,
            minStep: 25
          });

      return [infoService,this.Raylogic_Fan];
     }

	update_state(cs){
        if (cs > 0 || cs < 6){
            this.log.info("Valid feedback received and updated for Switch:", this.name, "associated with Area-Channel:", this.area,this.channel, "with current state:", cs);
            this.Raylogic_Fan.getCharacteristic(Characteristic.On).updateValue(Boolean(cs-1));
            this.Raylogic_Fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(25*(cs-1));
        }
        else {
            this.log.warn("Invalid feedback received for the Switch:", this.name, "associated with Area-Channel:", this.area,this.channel, "with current state:", cs, ". Valid numbers are 1 to 5 only");
        }
    }
}


/**
 * Raylogic_Curtain to Define the Fan Accessory
 * getServices method to declare the characteristics of the accessory
 * set_TargetPosition , get_TargetPosition method link to characteristics TargetPosition
 * set_TargetPosition method is invoked when Homekit changes the characteristics with latest value in parameter i.e. Operated from homekit
 * get_TargetPosition method is invoked when Homekit expects the current state of the characteristics
 *
 * get_CurrentPosition method link to characteristics CurrentPosition
 * get_CurrentPosition method is invoked when Homekit expects the current state of the characteristics
 *
 * get_PositionState method link to characteristics PositionState
 * get_PositionState method is invoked when Homekit expects the current state of the characteristics
 *
 */
class Raylogic_Curtain{
	constructor(name, area, channel, write, index, log){
        this.name = name;
        this.area = area;
        this.channel = ('00'+(Math.ceil(parseInt(channel, 16)/2)).toString(16)).slice(-2);
        this.write = write;
        this.index = index;
        this.log = log;
        this.Raylogic_Curtain = new Service.WindowCovering(this.name);
	}


    /**
     * Method to Trigger Fan when Requested from Apple Home
     * Command Structure = Command Origin + Unused + Function Type (Constant) + Area + Value + Channel + CarriageReturn;
     * Length of Command = 4 byte + 2 byte + 2 byte +2 byte + 2 byte + 2 byte
     * Value for Step 4 = 05
     * Value for Turning Off  = 01
     * Dimming - 05 (Step-4) to 01 (Off)
     * Sample Command from Area 01, Channel 01 & Switch off - *AR=001A010101 + CarriageReturn;
     * Sample Command from Area 01, Channel 01 & Switch on (100%) - *AR=001A010501 + CarriageReturn
     */
	set_TargetPosition(stt){
        this.log.info("Triggering the Fan:", this.name ,"associated with Area and Channel:", this.area,'&',this.channel,"for changing state to:",Number(stt));
        let cmd_data = '*AR=0027'+this.channel+'0'+(2- (stt/100)).toString()+'30'+'\r';
        this.write(cmd_data);
	}
    get_TargetPosition(){
        this.log.info("Requesting current state for the Fan:", "this.name Area and Channel:", this.area,'&',this.channel,"........received :",current_state[this.index]);
        return current_state[this.index];
    }

    get_CurrentPosition(){
        return current_state[this.index];
	}
    get_PositionState(){
        return 2;
    }

    getServices(){
      var infoService = new Service.AccessoryInformation();
        infoService
         .setCharacteristic(Characteristic.Manufacturer, "Raylogic")
         .setCharacteristic(Characteristic.Model, "Raylogic-Fan")
         .setCharacteristic(Characteristic.SerialNumber, this.area+this.channel);
         this.Raylogic_Curtain
         .getCharacteristic(Characteristic.TargetPosition).onGet(this.get_TargetPosition.bind(this)).onSet(this.set_TargetPosition.bind(this))
         .setProps({
            minValue: 0,
            maxValue: 100,
            minStep: 100
          });
         this.Raylogic_Curtain
         .getCharacteristic(Characteristic.CurrentPosition).onGet(this.get_CurrentPosition.bind(this))
         .setProps({
            minValue: 0,
            maxValue: 100,
            minStep: 100
          });
         this.Raylogic_Curtain
          .getCharacteristic(Characteristic.PositionState).onGet(this.get_PositionState.bind(this))
      return [infoService,this.Raylogic_Curtain];
     }

	update_state(cs){
        if (cs == 1 || cs == 2) {
            this.log.info("Valid feedback received and updated for Curtain:", this.name, "associated with Area-Channel:", this.area,this.channel, "with current state:", cs);
            this.Raylogic_Curtain.getCharacteristic(Characteristic.TargetPosition).updateValue((2-cs)*100);
            this.Raylogic_Curtain.getCharacteristic(Characteristic.CurrentPosition).updateValue((2-cs)*100);
        } else {
            this.log.warn("Invalid feedback received for the Curtain:", this.name, "associated with Area-Channel:", this.area,this.channel, "with current state:", cs, ". Valid numbers are 1 or 2 only");
        }
    }
}