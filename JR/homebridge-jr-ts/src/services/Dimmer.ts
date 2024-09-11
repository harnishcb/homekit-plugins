import { Socket } from "node:net";
import { API, CharacteristicValue, HAPStatus, HapStatusError, Logger, Service } from "homebridge";
import { JRAccessoryConfig, JRPlatformAccessory } from "../model/ConfigModel.js";
import { AbstractService } from "./AbstractService.js";
import { DT } from "../model/JRModel.js";
import { JRAccessory } from "../JRAccessory.js";

class Lightbulb extends AbstractService {

    private Dimmer = {
        On: false,
        Brightness: 100,
    };

    service: Service;

    constructor(
        readonly ac: JRAccessory,
        protected api: API,
        readonly log: Logger,
        readonly accessory: JRPlatformAccessory,
        readonly config: JRAccessoryConfig,
        public client: Socket,
    ) {
        super(api, accessory, config);

        this.service = this.getService(this.api.hap.Service.Lightbulb);
        this.service.setCharacteristic(api.hap.Characteristic.Name, `${config.name} ${config.dp_identifier}`);

        this.service.getCharacteristic(this.api.hap.Characteristic.On)!
            .onGet(this.onGetHandler.bind(this))
            .onSet(this.onSetHandler.bind(this));

        this.service.getCharacteristic(this.api.hap.Characteristic.Brightness)!
            .setProps({ minValue: 0, maxValue: 100, minStep: 1 })
            .onGet(this.brightnessGetHandler.bind(this))
            .onSet(this.brightnessSetHandler.bind(this));

        this.client.on("data", (stream) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                const res = JSON.parse(stream.toString()).report[0] as DT;
                if (res.dp_id === config.dp_id) {
                    // this.log.debug(JSON.stringify(res));
                    this.updateCharacteristics((res.value === 0 ? false : true), res.value as number);
                }
            } catch (e) {
                if (e instanceof Error) {
                    log.debug(`[DEBUG-JR] ${e.message}`);
                }
            }
        });
    }

    onGetHandler(cb: (hbs: HapStatusError, value: CharacteristicValue) => void) {
        if (!this.ac.isConnected) {
            // for getting no response
            cb(new this.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE), this.Dimmer.On);
        }
        return this.Dimmer.On;
    }

    onSetHandler(value: CharacteristicValue) {
        this.Dimmer.On = value as boolean;
        const cmd = {
            set: [
                {
                    dp_id: this.config.dp_id,
                    identifier: this.config.dp_identifier,
                    name: `${this.config.name} ${this.config.dp_identifier}`,
                    value: (value as boolean) ? ((this.Dimmer.Brightness === 0) ? 100 : this.Dimmer.Brightness) : 0,
                },
            ],
        };
        this.client.write(`${JSON.stringify(cmd)}\r\n`);
    }

    brightnessGetHandler() {
        return this.Dimmer.Brightness;
    }

    brightnessSetHandler(value: CharacteristicValue) {
        this.Dimmer.Brightness = value as number;
        const cmd = {
            set: [
                {
                    dp_id: this.config.dp_id,
                    identifier: this.config.dp_identifier,
                    name: `${this.config.name} ${this.config.dp_identifier}`,
                    value: value as number,
                },
            ],
        };
        this.client.write(`${JSON.stringify(cmd)}\r\n`);
    }

    updateCharacteristics(on: boolean, brightness: number) {
        this.Dimmer.On = on;
        this.Dimmer.Brightness = brightness;

        this.service.updateCharacteristic(this.api.hap.Characteristic.On, on);
        this.service.updateCharacteristic(this.api.hap.Characteristic.Brightness, brightness);
    }
}

export { Lightbulb };