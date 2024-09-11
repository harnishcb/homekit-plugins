"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOnOff = exports.transformOnOff = void 0;
const pilot_1 = require("../pilot");
function transformOnOff(pilot) {
    return Number(pilot.state);
}
exports.transformOnOff = transformOnOff;
function initOnOff(accessory, device, wiz) {
    const { Characteristic, Service } = wiz;
    const service = accessory.getService(Service.Lightbulb);
    service
        .getCharacteristic(Characteristic.On)
        .on("get", callback => pilot_1.getPilot(wiz, accessory, device, pilot => callback(null, transformOnOff(pilot)), callback))
        .on("set", (newValue, next) => {
        pilot_1.setPilot(wiz, accessory, device, { state: Boolean(newValue) }, next);
    });
}
exports.initOnOff = initOnOff;
//# sourceMappingURL=onOff.js.map