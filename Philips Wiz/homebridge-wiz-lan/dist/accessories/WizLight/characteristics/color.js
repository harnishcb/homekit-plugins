"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initColor = exports.transformSaturation = exports.transformHue = void 0;
const color_1 = require("../../../util/color");
const pilot_1 = require("../pilot");
function transformHue(pilot) {
    return pilot_1.pilotToColor(pilot).hue;
}
exports.transformHue = transformHue;
function initHue(accessory, device, wiz) {
    const { Characteristic, Service } = wiz;
    const service = accessory.getService(Service.Lightbulb);
    service
        .getCharacteristic(Characteristic.Hue)
        .on("get", callback => pilot_1.getPilot(wiz, accessory, device, pilot => callback(null, transformHue(pilot)), callback))
        .on("set", (newValue, next) => {
        pilot_1.setPilot(wiz, accessory, device, {
            temp: undefined,
            ...color_1.hsvToColor(Number(newValue) / 360, pilot_1.pilotToColor(pilot_1.cachedPilot[device.mac]).saturation / 100, wiz),
        }, pilot_1.updateColorTemp(device, accessory, wiz, next));
    });
}
function transformSaturation(pilot) {
    return pilot_1.pilotToColor(pilot).saturation;
}
exports.transformSaturation = transformSaturation;
function initSaturation(accessory, device, wiz) {
    const { Characteristic, Service } = wiz;
    const service = accessory.getService(Service.Lightbulb);
    service
        .getCharacteristic(Characteristic.Saturation)
        .on("get", (callback) => pilot_1.getPilot(wiz, accessory, device, pilot => callback(null, transformSaturation(pilot)), callback))
        .on("set", (newValue, next) => {
        pilot_1.setPilot(wiz, accessory, device, {
            temp: undefined,
            ...color_1.hsvToColor(pilot_1.pilotToColor(pilot_1.cachedPilot[device.mac]).hue / 360, Number(newValue) / 100, wiz),
        }, pilot_1.updateColorTemp(device, accessory, wiz, next));
    });
}
function initColor(accessory, device, wiz) {
    initHue(accessory, device, wiz);
    initSaturation(accessory, device, wiz);
}
exports.initColor = initColor;
//# sourceMappingURL=color.js.map