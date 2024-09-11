var Service, Characteristic;
var net = require('net');

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-jr", "JRPanel", jr_panel);
}

function jr_panel(log, config) {

    /* Mandatory Parameters */
    this.serial = config["Serial-No."];
    this.panel_ip = "192.168.0.10";
    this.panel_type = config["Panel-Type"];
    this.name = config["Panel-Name"];

    /* Logs */
    this.log = log;
}

jr_panel.prototype.accessories = function(callback) {

    var results = [];
    const panel_ip = this.panel_ip;
    const log = this.log;
    let client = new net.Socket();

    connectToServer(panel_ip, 4096);

    function connectToServer(serverHost, serverPort) {
        log.info(`Establishing connection with JR Panel at IP address: ${serverHost} over port no:, ${serverPort}`);
        client.connect(serverPort, serverHost, () => {
            log.info(`Connected to JR Panel to get the feedback at IP address: ${serverHost}`);
        });

        client.on('error', (err) => {
            log.error(`Connection error with JR Panel: ${err.message}`);
        });

        client.on('close', () => {
            log.warn(`Connection closed with JR Panel at IP address: ${panel_ip}`);
            reconnect();
        });

        client.on('data', (data) => {
            parseData(data.toString());
        });
    }

    function reconnect() {
        log.info(`Reconnecting to Panel at IP address:${panel_ip} and port 4096`);
        setTimeout(() => {
            client.removeAllListeners(); // Remove previous event listeners
            client = new net.Socket(); // Create a new instance of the client
            connectToServer(panel_ip, 4096); // Attempt to reconnect
        }, 3000); // Adjust the timeout as needed
    }

    function write(data) {
        client.write(data + '\r\n');
    }

    function parseData(data) {
        const jsonData = JSON.parse(data);
        const reports = jsonData.report;

        for (let i = 0; i < reports.length; i++) {
            const report = reports[i];
            if (report.identifier.startsWith('switch')) {
                const { dp_id, identifier, name, value } = report;
                log.info(`Found switch data: dp_id=${dp_id}, identifier=${identifier}, name=${name}, value=${value}`);
        }
    }
    }
    callback(results)
    
}


class JR_Switch {
	constructor(id, name, log, write) {
        this.id = id;
        this.name =  name;
        this.log = log;
        this.write = write;
        this.JR_Switch = new Service.Switch(this.name);
        this.state_On = false;
	}

	set_On(stt) {
        this.log.info(`Triggering the Switch: ${this.name}, for changing state to: ${stt}`);
    }

    get_On() {
        this.log.info(`Requesting current state for the JR Switch: ${this.name}, receive state: ${this.state_On}`);
        return this.state_On;
    }

    getServices() {
        var infoService = new Service.AccessoryInformation();
        infoService
            .setCharacteristic(Characteristic.Manufacturer, "JR Automation")
            .setCharacteristic(Characteristic.Model, "JR-Switch")
            .setCharacteristic(Characteristic.SerialNumber, this.name);
        this.JR_Switch 
            .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));

        return [infoService, this.JR_Switch];
    }

    update_state(cs){

        if (cs == 0 || cs == 100) {
            this.log.info("Valid feedback received and updated for Switch:", this.name, "associated with HDL address:", this.HDL_addr, "with current state:", cs/100);
            this.JR_Switch.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
        }
        else {
            this.log.warn("Invalid feedback received for the Switch:", this.name, "associated with HDL address:", this.HDL_addr, "with current state:", cs, ". Valid numbers are 0 or 100 only");
        }

    }
}

class JR_Fan{
    constructor(id, name, log, fan_step, write){
        this.id = id;
        this.name =  name;
        this.log = log;
        this.write = write;
        this.fan_step = Math.round(100/fan_step);
        this.JR_Switch = new Service.Fan(this.name);
        this.last_brightness = 100;
    }
    set_On(stt){
        this.log.info("Triggering the JR Fan:", this.name ,"for changing state to:",Number(stt));
        setTimeout(() => {
          if (stt == false) {
            let str  = 'Fan:'+this.id+':eventSpeedLevel:0';
            this.write(str);
          }
          else {
            let str  = 'Fan:'+this.id+':eventSpeedLevel:'+String(this.last_brightness);
            this.write(str);
          }
        } , 350)
    }
    
    get_On(){
    this.log.info("Requesting current state for the JR Fan:", this.name ,"........received :",current_fan_state[this.index]);
    return Boolean(current_fan_state[this.index]);
    }

    set_RotationSpeed(stt){
    stt = this.customMapping(stt);
    if (stt !== 0){
        this.last_brightness = stt;
    }
    let str  = 'Fan:'+this.id+':eventSpeedLevel:'+String(stt);
    this.write(str);
    }

    get_RotationSpeed(){
        this.log.info("Requesting current state for the JR Fan:", this.name ,"........received :",current_fan_state[this.index]);
        return this.customMapping(Number(current_fan_state[this.index]));
    }

    customMapping(number) {
        if (number === 66) {
            return 67;
        } else if (number === 99) {
            return 100;
        } else {
            return number;
        }
    }

    getServices(){
        var infoService = new Service.AccessoryInformation();
          infoService
           .setCharacteristic(Characteristic.Manufacturer, "JR Fan")
           .setCharacteristic(Characteristic.Model, "Fan")
           .setCharacteristic(Characteristic.SerialNumber, "CESWT-"+this.id);
        this.JR_Fan
           .getCharacteristic(Characteristic.On).onGet(this.get_On.bind(this)).onSet(this.set_On.bind(this));
        this.JR_Fan
           .getCharacteristic(Characteristic.RotationSpeed).onGet(this.get_RotationSpeed.bind(this)).onSet(this.set_RotationSpeed.bind(this))
           .setProps({
            minValue: 0,
            maxValue: 100,
            minStep: this.fan_step
          });
  
        return [infoService,this.Crestron_Fan];
    }

    update_state(cs){
        this.log.info('Request to update the state of', this.name, 'to ->',cs);
            this.JR_Fan.getCharacteristic(Characteristic.On).updateValue(Boolean(cs));
        this.JR_Fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.customMapping(cs));
    }
}