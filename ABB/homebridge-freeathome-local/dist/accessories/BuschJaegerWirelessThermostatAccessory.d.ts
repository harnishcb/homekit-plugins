export = BuschJaegerWirelessThermostatAccessory;
declare function BuschJaegerWirelessThermostatAccessory(platform: any, Service: any, Characteristic: any, actuator: any, channel?: null, mapping?: null, ...args: any[]): void;
declare class BuschJaegerWirelessThermostatAccessory {
    constructor(platform: any, Service: any, Characteristic: any, actuator: any, channel?: null, mapping?: null, ...args: any[]);
    channel: string;
    lastTargetTemperature: number;
    getCurrentHeatingCoolingState: (callback: any) => void;
    getTargetHeatingCoolingState: (callback: any) => void;
    setTargetHeatingCoolingState: (value: any, callback: any) => void;
    getCurrentTemperature: (callback: any) => void;
    getTargetTemperature: (callback: any) => void;
    setTargetTemperature: (value: any, callback: any) => void;
    getTemperatureDisplayUnits: (callback: any) => void;
    updateCharacteristics: () => void;
    roundHalf: (value: any) => string;
}
