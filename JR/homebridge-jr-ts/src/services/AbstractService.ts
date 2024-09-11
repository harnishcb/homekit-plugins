import { API, Service, WithUUID } from "homebridge";
import { JRAccessoryConfig, JRPlatformAccessory } from "../model/ConfigModel.js";


abstract class AbstractService {
    constructor(
        protected api: API,
        protected accessory: JRPlatformAccessory,
        public config: JRAccessoryConfig,
    ) {
        //
        this.getService(this.api.hap.Service.AccessoryInformation)!
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "JR Automation")
            .setCharacteristic(this.api.hap.Characteristic.SerialNumber, `Cue-Home-JR-${config.panel}`)
            .setCharacteristic(this.api.hap.Characteristic.Model, `${config.panel}`);
    }

    // run all necessary service base on their type
    getService(service: WithUUID<typeof Service>): Service {
        return this.accessory.getService(service) ??
            this.accessory.addService(service, `${this.accessory.displayName} ${this.config.name}`, this.config.name);
    }
}

export { AbstractService };