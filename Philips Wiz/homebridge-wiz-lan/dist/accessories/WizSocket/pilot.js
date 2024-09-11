"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPilot = exports.getPilot = exports.cachedPilot = void 0;
const network_1 = require("../../util/network");
const characteristics_1 = require("./characteristics");
// We need to cache all the state values
// since we need to send them all when
// updating, otherwise the bulb resets
// to default values
exports.cachedPilot = {};
function updatePilot(wiz, accessory, _, pilot) {
    const { Service } = wiz;
    const service = accessory.getService(Service.Outlet);
    service
        .getCharacteristic(wiz.Characteristic.On)
        .updateValue(pilot instanceof Error ? pilot : characteristics_1.transformOnOff(pilot));
}
// Write a custom getPilot/setPilot that takes this
// caching into account
function getPilot(wiz, accessory, device, onSuccess, onError) {
    const { Service } = wiz;
    const service = accessory.getService(Service.Outlet);
    let callbacked = false;
    const onDone = (error, pilot) => {
        const shouldCallback = !callbacked;
        callbacked = true;
        if (error !== null) {
            if (shouldCallback) {
                onError(error);
            }
            else {
                service.getCharacteristic(wiz.Characteristic.On).updateValue(error);
            }
            delete exports.cachedPilot[device.mac];
            return;
        }
        exports.cachedPilot[device.mac] = pilot;
        if (shouldCallback) {
            onSuccess(pilot);
        }
        else {
            updatePilot(wiz, accessory, device, pilot);
        }
    };
    const timeout = setTimeout(() => {
        if (device.mac in exports.cachedPilot) {
            onDone(null, exports.cachedPilot[device.mac]);
        }
        else {
            onDone(new Error("No response within 1s"), undefined);
        }
    }, 1000);
    network_1.getPilot(wiz, device, (error, pilot) => {
        clearTimeout(timeout);
        onDone(error, pilot);
    });
}
exports.getPilot = getPilot;
function setPilot(wiz, _, device, pilot, callback) {
    var _a;
    const oldPilot = exports.cachedPilot[device.mac];
    if (typeof oldPilot == "undefined") {
        return;
    }
    const newPilot = {
        ...oldPilot,
        state: (_a = oldPilot.state) !== null && _a !== void 0 ? _a : false,
        ...pilot,
        sceneId: undefined,
    };
    exports.cachedPilot[device.mac] = {
        ...oldPilot,
        ...newPilot,
    };
    return network_1.setPilot(wiz, device, newPilot, (error) => {
        if (error !== null) {
            exports.cachedPilot[device.mac] = oldPilot;
        }
        callback(error);
    });
}
exports.setPilot = setPilot;
//# sourceMappingURL=pilot.js.map