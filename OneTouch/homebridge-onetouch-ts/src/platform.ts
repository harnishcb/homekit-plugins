import {
    API,
    APIEvent,
    Characteristic,
    DynamicPlatformPlugin,
    Logger,
    PlatformAccessory,
    PlatformConfig,
    Service,
    UnknownContext
} from "homebridge";
import { OneTouchStation } from "./OneTouch/DoorbellAccessory.js";
import { PLATFORM_NAME, PLUGIN_NAME } from "./settings.js";
import { DeviceConfig } from "./types/DataModel.js";



export class OneTouch implements DynamicPlatformPlugin {
    public readonly Services: typeof Service = this.api.hap.Service
    public readonly Characteristics: typeof Characteristic = this.api.hap.Characteristic

    debugMode = true;

    public readonly accessories: PlatformAccessory[] = [];
    constructor(
        public readonly log: Logger,
        public readonly config: PlatformConfig,
        public readonly api: API
    ) {
        this.log.debug(`Finished initializing platform : ${this.config.name}`)

        this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
            this.log.debug('Executed didFinishLaunching callback');
            this.discoverAccessories();
        });
    }

    configureAccessory(accessory: PlatformAccessory<UnknownContext>): void {
        this.log.info(`Loading accessory from cache: [${accessory.displayName}], UUID: [${accessory.UUID}]`);
        this.accessories.push(accessory);
    }

    async discoverAccessories() {

        const devices: DeviceConfig[] = this.config.devices;

        devices?.forEach((device) => {
            const accessoryName = device.name;
            const uuid = this.api.hap.uuid.generate(accessoryName);

            const existingAccessory = this.accessories.find(a => a.UUID === uuid);

            if (existingAccessory) {
                this.log.info(`Caching ${existingAccessory.displayName}`);
                new OneTouchStation(this, existingAccessory,device);
            } else {
                this.log.info(`Adding new accessory : ${accessoryName}`);

                const accessory = new this.api.platformAccessory(accessoryName, uuid);
                accessory.context = device;
                new OneTouchStation(this, accessory,device);

                this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
        })
    }
}