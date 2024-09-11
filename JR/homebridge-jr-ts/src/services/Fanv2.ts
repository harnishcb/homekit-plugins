import { API, CharacteristicValue, HAPStatus, HapStatusError, Logger, Service } from "homebridge";
import { Socket } from "node:net";
import { JRAccessoryConfig, JRPlatformAccessory } from "../model/ConfigModel.js";
import { DT } from "../model/JRModel.js";
import { AbstractService } from "./AbstractService.js";
import { JRAccessory } from "../JRAccessory.js";

// see: https://developers.homebridge.io/#/characteristic/Active
const enum ActiveStateType {
    INACTIVE,
    ACTIVE
}

class Fan extends AbstractService {

    private fanState = {
        Active: ActiveStateType.INACTIVE,
        RotationSpeed: 100,
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

        this.service = this.getService(this.api.hap.Service.Fanv2);

        this.service.setCharacteristic(api.hap.Characteristic.Name, `${config.name} ${config.dp_identifier}`);

        this.service.getCharacteristic(this.api.hap.Characteristic.Active)!
            .onGet(this.activeGetHandler.bind(this))
            .onSet(this.activeSetHandler.bind(this));

        this.service.getCharacteristic(this.api.hap.Characteristic.RotationSpeed)!
            .setProps({ minValue: 0, maxValue: 100, minStep: 25 })
            .onGet(this.rotationSpeedGetHandler.bind(this))
            .onSet(this.rotationSpeedSetHandler.bind(this));

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

    activeGetHandler(cb: (hbs: HapStatusError, value: CharacteristicValue) => void) {
        if (!this.ac.isConnected) {
            // for getting no response
            cb(new this.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE), this.fanState.Active);
        }
        return this.fanState.Active;
    }

    activeSetHandler(value: CharacteristicValue) {
        const cmd = {
            set: [
                {
                    dp_id: this.config.dp_id,
                    identifier: this.config.dp_identifier,
                    name: `${this.config.name} ${this.config.dp_identifier}`,
                    value: (value as boolean) ? (this.fanState.RotationSpeed === 0 ? 100 : this.fanState.RotationSpeed) : 0,
                },
            ],
        };
        this.client.write(`${JSON.stringify(cmd)}\r\n`);
    }

    rotationSpeedGetHandler() {
        return this.fanState.RotationSpeed;
    }

    rotationSpeedSetHandler(value: CharacteristicValue) {
        this.fanState.RotationSpeed = value as number;
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

    updateCharacteristics(active: boolean, speed: number) {
        this.fanState.Active = active ? ActiveStateType.ACTIVE : ActiveStateType.INACTIVE;
        this.fanState.RotationSpeed = speed;

        this.service.updateCharacteristic(this.api.hap.Characteristic.Active, active);
        this.service.updateCharacteristic(this.api.hap.Characteristic.RotationSpeed, speed);
    }

}

export { Fan };