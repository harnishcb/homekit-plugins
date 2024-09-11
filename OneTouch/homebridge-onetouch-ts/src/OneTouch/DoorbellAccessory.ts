import got from "got";
import {
    CharacteristicValue,
    PlatformAccessory,
    PlatformAccessoryEvent,
} from "homebridge";
import { OneTouch } from "../platform.js";
import { CameraConfig, DeviceConfig } from "../types/DataModel.js";
import { callStatus, FirmwareStatus, relayStatus } from "../types/ResponseModel.js";
import { StreamingDelegate } from "./stream.js";

const version = "1.0.0"

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// CURRENT STATE ENUM
// See : https://developers.homebridge.io/#/characteristic/LockCurrentState
const enum LockCurrentState {
    UNSECURED,
    SECURED,
    JAMMED,
    UNKNOWN
}

// TARGET STATE ENUM
// See : https://developers.homebridge.io/#/characteristic/LockTargetState
const enum LockTargetState {
    UNSECURED,
    SECURED
}


export class OneTouchStation {

    name: string;
    host: string;

    // HTTP API username/password
    username: string;
    password: string;
    lockTimeout: number;

    cameraConfig: CameraConfig;

    // Call Notification
    counter = 0
    isTalking = false;

    private lockState = {
        CurrentState: LockCurrentState.SECURED,
        TargetState: LockTargetState.SECURED
    }
    streamingDelegate = null as any;

    private readonly motionTimers: Map<string, NodeJS.Timeout> = new Map();
    private readonly doorbellTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        public readonly platform: OneTouch,
        public readonly accessory: PlatformAccessory,
        public readonly deviceConfig: DeviceConfig,
    ) {
        this.host = deviceConfig.host;
        this.name = deviceConfig.name;
        this.username = deviceConfig.username || "admin";
        this.password = deviceConfig.password || "admin";
        this.lockTimeout = deviceConfig.lockTimeout * 1000 || 3000;
        this.cameraConfig = deviceConfig.cameraConfig;

        let error = false;

        // check basic necessary items

        if (!this.cameraConfig.name) {
            this.platform.log.error('One of your cameras has no name configured. This camera will be skipped.');
            error = true;
        }
        if (!this.cameraConfig.videoConfig) {
            this.platform.log.error('The videoConfig section is missing from the config. This camera will be skipped.', this.cameraConfig.name);
            error = true;
        } else {
            if (!this.cameraConfig.videoConfig.source) {
                this.platform.log.error('There is no source configured for this camera. This camera will be skipped.', this.cameraConfig.name);
                error = true;
            } else {
                const sourceArgs = this.cameraConfig.videoConfig.source.split(/\s+/);
                if (!sourceArgs.includes('-i')) {
                    this.platform.log.warn('The source for this camera is missing "-i", it is likely misconfigured.', this.cameraConfig.name);
                }
            }
            if (this.cameraConfig.videoConfig.stillImageSource) {
                const stillArgs = this.cameraConfig.videoConfig.stillImageSource.split(/\s+/);
                if (!stillArgs.includes('-i')) {
                    this.platform.log.warn('The stillImageSource for this camera is missing "-i", it is likely misconfigured.', this.cameraConfig.name);
                }
            }
            if (this.cameraConfig.videoConfig.vcodec === 'copy' && this.cameraConfig.videoConfig.videoFilter) {
                this.platform.log.warn('A videoFilter is defined, but the copy vcodec is being used. This will be ignored.', this.cameraConfig.name);
            }
        }

        // setup for camera controller
        const delegate = new StreamingDelegate(this.platform.log, this.cameraConfig, this.platform.api, this.platform.api.hap, this.deviceConfig.videoProcessor);
        this.accessory.configureController(delegate.controller)

        // configure services
        this.configureDoorPhone();

        // for continuous checking call status
        this.getCallStatus();
    }

    /**
     * OneTouch does not have any event trigger for call status
     * So check continuous through HTTP API
     * @returns nothing
     */
    private async getCallStatus(): Promise<void> {

        // fetch call status 
        const res = await got.get(`http://${this.deviceConfig.host}/api/call/status`, { username: this.username, password: this.password }).json<callStatus>()
            .catch((e) => {
                if (e instanceof Error) {
                    this.platform.log.debug(e.message);
                }
            });

        // if response is Invalid
        if (typeof res === 'undefined') {
            this.platform.log.debug(`[DEBUG-OneTouch] API response invalid...`);
            return;
        }

        // Check call status
        // only two available right now : READY | TALKING
        switch (res!.data.Status) {
            case "READY":
                // this.platform.log.debug(`OneTouch is ready to call...`);
                this.counter = 0
                this.isTalking = false;
                break;
            case "TALKING":
                this.platform.log.debug(`OneTouch is TALKING...`)
                this.isTalking = !this.isTalking;

                // Handle DoorBell rang
                const temp = this.accessory.getService(this.platform.Services.LockMechanism)!
                    .getCharacteristic(this.platform.Characteristics.LockCurrentState).value
                if (temp === 1 && this.isTalking && this.counter < 2) {
                    this.accessory.getService(this.platform.Services.Doorbell)!
                        .updateCharacteristic(this.platform.Characteristics.ProgrammableSwitchEvent,
                            this.platform.Characteristics.ProgrammableSwitchEvent.SINGLE_PRESS);
                    this.counter++;
                }
                // this.isTalking = true;
                break;
        }

        setTimeout(() => this.getCallStatus(), 3000);
    }

    /**
     * Invoke necessary service for OneTouch DoorPhone
     * 
     * @returns {boolean} true if properly configure
     */
    private async configureDoorPhone(): Promise<boolean> {

        this.accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
            this.platform.log.info('Identify requested.', this.accessory.displayName);
        });

        // Configure Basic information
        if (!(await this.configureInfo())) {
            return false;
        }

        // Configure Lock sevice
        if (!(await this.configureRelays())) {
            return false;
        }

        // Configure Doorbell service
        if (!(await this.configureDoorBell())) {
            return false;
        }

        // Configure Motion service
        // todo: right now not any way to check this
        // if (!(await this.configureMotionSensor())) {
        //     return false
        // }

        // Refresh the accessory cache with these values
        this.platform.api.updatePlatformAccessories([this.accessory]);

        return true;
    }

    // Setup basic information 
    private async configureInfo(): Promise<boolean> {

        await got.get(`http://${this.deviceConfig.host}/api/firmware/status`, { username: this.username, password: this.password }).json<FirmwareStatus>()
            .then((res) => {
                this.accessory.getService(this.platform.Services.AccessoryInformation)!
                    .setCharacteristic(this.platform.Characteristics.Manufacturer, this.cameraConfig.manufacturer || 'OneTouch')
                    .setCharacteristic(this.platform.Characteristics.Model, res.data.Model || 'unknown')
                    .setCharacteristic(this.platform.Characteristics.SerialNumber, this.cameraConfig.serialNumber || 'unknown')
                    .setCharacteristic(this.platform.Characteristics.FirmwareRevision, res.data.FirmwareVersion || version)
                    .setCharacteristic(this.platform.Characteristics.HardwareRevision, res.data.HardwareVersion || version);
            });
        // .catch((e) => {
        //     this.platform.log.debug(`[DEBUG] Invalid Accessory Information configuration.`);
        // })

        return true;
    }

    // Lock Mechanism
    private async configureRelays(): Promise<boolean> {

        const relayService = this.accessory.getService(this.platform.Services.LockMechanism) || this.accessory.addService(this.platform.Services.LockMechanism, 'RELAY', 'RELAY A');

        // Fetch initial state
        await got.get(`http://${this.deviceConfig.host}/api/relay/status`, { username: this.username, password: this.password }).json<relayStatus>()
            .then((res) => {
                // OneTouch has invert system from HomeKit
                // 1 - Unlocked
                // 0 - Locked
                this.lockState.CurrentState = res.data.RelayA == 0 ? LockCurrentState.SECURED : LockCurrentState.UNSECURED;
                return this.lockState.CurrentState;
            }).catch((e) => {
                this.platform.log.debug((e as Error).message);
            });

        // Handle Current State of Lock
        relayService.getCharacteristic(this.platform.Characteristics.LockCurrentState)
            .onGet(async () => {

                // Fetch lock status
                await got.get(`http://${this.deviceConfig.host}/api/relay/status`, { username: this.username, password: this.password }).json<relayStatus>()
                    .then((res) => {
                        this.lockState.CurrentState = res.data.RelayA === 0 ? LockCurrentState.SECURED : LockCurrentState.UNSECURED;
                    }).catch((e) => {
                        this.platform.log.debug((e as Error).message);
                    });

                // print log
                this.platform.log.debug(`CurrentState : ${this.lockState.CurrentState}`)
                return this.lockState.CurrentState;
            });

        // Handle Target State of Lock
        relayService.getCharacteristic(this.platform.Characteristics.LockTargetState)
            .setProps({ minValue: 0, maxValue: 1, minStep: 1 })
            .onGet(async () => {

                // Fetch Target State
                await got.get(`http://${this.deviceConfig.host}/api/relay/status`, { username: this.username, password: this.password }).json<relayStatus>()
                    .then((res) => {
                        this.lockState.TargetState = res.data.RelayA == 0 ? LockTargetState.SECURED : LockTargetState.UNSECURED;
                    }).catch((e) => {
                        this.platform.log.debug((e as Error).message);
                    })

                // Print log
                this.platform.log.debug(`TargetState : ${this.lockState.TargetState}`)
                return this.lockState.TargetState;
            })
            .onSet(async (value: CharacteristicValue) => {
                this.lockState.TargetState = value as number;

                // For unlock only lock will automatically setup
                if ((value as number) === LockTargetState.UNSECURED) {
                    // send unlock command
                    await got.post(`http://${this.deviceConfig.host}/api/`, {
                        username: this.username,
                        password: this.password,
                        json: {
                            "target": "relay",
                            "action": "trig",
                            "data": {
                                "mode": 0,
                                "num": 1,
                                "level": 1,
                                "delay": 5
                            }
                        }
                    }).json<relayStatus>()
                        .then((res) => {
                            if (res.message !== "OK") {
                                this.platform.log.error(`Message sent error : ${JSON.stringify(res)}`);
                            }
                        }).catch((e) => {
                            this.platform.log.debug((e as Error).message);
                        });

                    //  Send command for Hangup
                    await got.get(`http://${this.deviceConfig.host}/api/call/hangup`, {
                        username: this.username,
                        password: this.password
                    }).catch((e) => {
                        this.platform.log.debug((e as Error).message);
                    });
                }
                setTimeout(() => {
                    relayService.updateCharacteristic(this.platform.Characteristics.LockCurrentState, LockCurrentState.SECURED);
                    relayService.updateCharacteristic(this.platform.Characteristics.LockTargetState, LockTargetState.SECURED);
                }, this.lockTimeout)
            });
        return true;
    }

    // Configure motion sensor on the OneTouch doorbell for HomeKit.
    // Right now it will show only service now configured.
    // todo: Configure Motion service
    // ? How to get motion sensor data.
    private async configureMotionSensor(): Promise<boolean> {

        const motionService = this.accessory.getService(this.platform.Services.MotionSensor) || this.accessory.addService(this.platform.Services.MotionSensor, 'MOTION', 'Motion Sensor')

        // Todo : check how to sense motion sensor
        motionService.getCharacteristic(this.platform.Characteristics.MotionDetected)
            .onGet(async () => {
                return false
            })
        return true;
    }

    // Doorbell
    private async configureDoorBell(): Promise<boolean> {

        const service = this.accessory.getService(this.platform.Services.Doorbell) || this.accessory.addService(this.platform.Services.Doorbell, 'DOORBELL', 'Doorbell');

        service.getCharacteristic(this.platform.Characteristics.ProgrammableSwitchEvent)
            .onGet(async () => {
                // HomeKit wants this to always be null.
                return null;
            });

        return true;
    }
}