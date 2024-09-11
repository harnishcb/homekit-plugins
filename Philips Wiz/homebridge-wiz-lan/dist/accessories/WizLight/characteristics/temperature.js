"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTemperature = exports.transformTemperature = void 0;
const color_1 = require("../../../util/color");
const pilot_1 = require("../pilot");
function transformTemperature(pilot) {
    return color_1.kelvinToMired(pilot_1.pilotToColor(pilot).temp);
}
exports.transformTemperature = transformTemperature;
function initTemperature(accessory, device, wiz) {
    const { Characteristic, Service } = wiz;
    const service = accessory.getService(Service.Lightbulb);
    service
        .getCharacteristic(Characteristic.ColorTemperature)
        .on("get", (callback) => pilot_1.getPilot(wiz, accessory, device, (pilot) => callback(null, transformTemperature(pilot)), callback))
        .on("set", (newValue, next) => {
        pilot_1.setPilot(wiz, accessory, device, {
            temp: color_1.miredToKelvin(Number(newValue)),
            r: undefined,
            g: undefined,
            b: undefined,
        }, pilot_1.updateColorTemp(device, accessory, wiz, next));
    });
}
exports.initTemperature = initTemperature;
//# sourceMappingURL=temperature.js.map