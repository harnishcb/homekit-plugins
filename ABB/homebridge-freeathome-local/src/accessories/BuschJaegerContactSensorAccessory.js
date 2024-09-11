"use strict";

var BuschJaegerAccessory = require('./BuschJaegerAccessory.js').BuschJaegerAccessory;

class BuschJaegerContactSensorAccessory extends BuschJaegerAccessory {
    constructor(platform, Service, Characteristic, actuator, channel = null, mapping = null) {
        super(platform, Service, Characteristic, actuator, channel, mapping)

        var contactService = new Service.ContactSensor()

        contactService.getCharacteristic(Characteristic.ContactSensorState)
            .on('get', this.getContactSensorState.bind(this));
    
        this.services.contact = contactService;
    }

    getContactSensorState(callback) {
        //find the correct contact sensor output datapoint
        let outputDatapoints = this.platform.actuatorInfo[this.serial]['channels']['ch' + this.channel]['outputs']
        let contactSensorODP = 'odp0000'
        for (const outputDatapoint in outputDatapoints){
            if(outputDatapoints[outputDatapoint]['pairingID'] === 53){
                contactSensorODP = outputDatapoint.toString()
                break;
            }
        }
        let detected = parseInt(this.getValue(this.channel, contactSensorODP)) == 1 ? this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED : this.Characteristic.ContactSensorState.CONTACT_DETECTED;
        callback(null, detected);
    }

    updateCharacteristics() {
        this.getContactSensorState((_, value) => this.services.contact.getCharacteristic(this.Characteristic.ContactSensorState).updateValue(value))
    }
}

module.exports = BuschJaegerContactSensorAccessory
