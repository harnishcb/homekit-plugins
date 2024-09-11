import { API, CharacteristicValue, HAPStatus, HapStatusError, Logger, Service } from "homebridge";
import { Socket } from "node:net";
import { JRAccessoryConfig, JRPlatformAccessory } from "../model/ConfigModel.js";
import { DT } from "../model/JRModel.js";
import { AbstractService } from "./AbstractService.js";
import { JRAccessory } from "../JRAccessory.js";

class Switch extends AbstractService {

    private SwitchState = {
        On: false,
    };

    service: Service;
    constructor(
        readonly ac: JRAccessory,
        protected api: API,
        readonly log: Logger,
        accessory: JRPlatformAccessory,
        config: JRAccessoryConfig,
        readonly client: Socket,
    ) {
        super(api, accessory, config);

        this.service = this.getService(this.api.hap.Service.Switch);

        this.service.setCharacteristic(api.hap.Characteristic.Name, `${config.name} ${config.dp_identifier}`);

        this.service.getCharacteristic(this.api.hap.Characteristic.On)
            .onGet(this.onGetHandler.bind(this))
            .onSet(this.onSetHandler.bind(this));

        client.on("data", (stream) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                const res = JSON.parse(stream.toString()).report[0] as DT;
                if (res.dp_id === config.dp_id) {
                    // this.log.debug(JSON.stringify(res));
                    this.updateCharacteristics(res.value as boolean);
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
            cb(new this.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE), this.SwitchState.On);
        }
        return this.SwitchState.On;
    }


    onSetHandler(value: CharacteristicValue) {
        this.SwitchState.On = value as boolean;
        const cmd = {
            set: [
                {
                    dp_id: this.config.dp_id,
                    identifier: this.config.dp_identifier,
                    name: `${this.config.name} ${this.config.dp_identifier}`,
                    value: value as boolean,
                },
            ],
        };
        this.client.write(`${JSON.stringify(cmd)}\r\n`);
    }

    updateCharacteristics(on: boolean) {
        this.SwitchState.On = on;

        this.service.updateCharacteristic(this.api.hap.Characteristic.On, on);
    }

}

export { Switch };