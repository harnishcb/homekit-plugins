"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDimming = exports.transformDimming = void 0;
const pilot_1 = require("../pilot");
function transformDimming(pilot) {
    // do the reverse of the below
    // 10% <-> 100% --> 1% <-> 100% 
    return Math.floor(Number(pilot.dimming) * 1.1) - 10;
}
exports.transformDimming = transformDimming;
function initDimming(accessory, device, wiz) {
    const { Characteristic, Service } = wiz;
    const service = accessory.getService(Service.Lightbulb);
    service
        .getCharacteristic(Characteristic.Brightness)
        .on("get", (callback) => pilot_1.getPilot(wiz, accessory, device, (pilot) => callback(null, transformDimming(pilot)), callback))
        .on("set", (newValue, next) => {
        pilot_1.setPilot(wiz, accessory, device, 
        // for some reason < 10% is invalid, so we gotta fit 0% <-> 100% it into 10% <-> 100%
        // 0%, 1% -> 10% since that's the minimum acceptable value
        { dimming: Math.floor(Number(newValue) * 0.9) + 10 }, next);
    });
}
exports.initDimming = initDimming;
//# sourceMappingURL=dimming.js.map