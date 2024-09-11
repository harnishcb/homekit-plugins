import { API, CharacteristicValue, HAPStatus, HapStatusError, Logger, Service } from "homebridge";
import { Socket } from "node:net";
import { JRPlatformAccessory, JRAccessoryConfig } from "../model/ConfigModel.js";
import { DT } from "../model/JRModel.js";
import { AbstractService } from "./AbstractService.js";
import { JRAccessory } from "../JRAccessory.js";

class Curtain extends AbstractService {

    private CurtainState = {
        CurrentPosition: 100,
        PositionState: 2,
        TargetPosition: 100,
    };

    service: Service;
    constructor(
        readonly ac: JRAccessory,
        protected api: API,
        readonly log: Logger,
        readonly accessory: JRPlatformAccessory,
        readonly config: JRAccessoryConfig,
        readonly client: Socket,
    ) {
        super(api, accessory, config);

        this.service = this.getService(api.hap.Service.WindowCovering);

        this.service.setCharacteristic(api.hap.Characteristic.Name, `${config.name} ${config.dp_identifier}`);

        this.service.getCharacteristic(this.api.hap.Characteristic.CurrentPosition)!
            .onGet(this.currentPosGetHandler.bind(this));

        this.service.getCharacteristic(this.api.hap.Characteristic.PositionState)
            .onGet(this.positionStateGetHandler.bind(this));

        this.service.getCharacteristic(this.api.hap.Characteristic.TargetPosition)
            .setProps({ minValue: 0, maxValue: 100, minStep: 1 })
            .onGet(this.targetPosGetHandler.bind(this))
            .onSet(this.targetPosSetHandler.bind(this));

        //handle data event and update characteristics
        client.on("data", (stream) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                const res = JSON.parse(stream.toString()).report[0] as DT;
                if (res.dp_id === config.dp_id) {
                    // this.log.debug(JSON.stringify(res));
                    this.updateCharacteristics(res.value as number);
                }
            } catch (e) {
                if (e instanceof Error) {
                    log.debug(`[DEBUG-JR] ${e.message}`);
                }
            }
        });
    }

    currentPosGetHandler(cb: (hbs: HapStatusError, value: CharacteristicValue) => void) {
        if (!this.ac.isConnected) {
            // for getting no response
            cb(new this.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE), this.CurtainState.CurrentPosition);
        }
        return this.CurtainState.CurrentPosition;
    }

    positionStateGetHandler() {
        return this.CurtainState.PositionState;
    }

    targetPosGetHandler() {
        return this.CurtainState.TargetPosition;
    }

    targetPosSetHandler(value: CharacteristicValue) {
        this.CurtainState.TargetPosition = value as number;

        const cmd = {
            set: [
                {
                    dp_id: 124 + ((this.config.dp_id - 124) *2),
                    identifier: this.config.dp_identifier,
                    name: `${this.config.name} ${this.config.dp_identifier}`,
                    value: (value as number) === 0 ? 0 : this.CurtainState.TargetPosition,
                },
            ],
        };
        this.client.write(`${JSON.stringify(cmd)}\r\n`);
    }

    updateCharacteristics(tarPos: number) {
        this.CurtainState.TargetPosition = tarPos;
        this.CurtainState.CurrentPosition = tarPos;

        this.service.updateCharacteristic(this.api.hap.Characteristic.TargetPosition, tarPos);
        setTimeout(() => this.service.updateCharacteristic(this.api.hap.Characteristic.CurrentPosition, tarPos), 1000);
    }

}

export { Curtain };