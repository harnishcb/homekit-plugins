"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateColorTemp = exports.pilotToColor = exports.setPilot = exports.getPilot = exports.disabledAdaptiveLightingCallback = exports.cachedPilot = void 0;
const network_1 = require("../../util/network");
const color_1 = require("../../util/color");
const util_1 = require("./util");
const characteristics_1 = require("./characteristics");
const scenes_1 = require("./characteristics/scenes");
// We need to cache all the state values
// since we need to send them all when
// updating, otherwise the bulb resets
// to default values
exports.cachedPilot = {};
exports.disabledAdaptiveLightingCallback = {};
function updatePilot(wiz, accessory, device, pilot) {
    const { Service } = wiz;
    const service = accessory.getService(Service.Lightbulb);
    service
        .getCharacteristic(wiz.Characteristic.On)
        .updateValue(pilot instanceof Error ? pilot : characteristics_1.transformOnOff(pilot));
    service
        .getCharacteristic(wiz.Characteristic.Brightness)
        .updateValue(pilot instanceof Error ? pilot : characteristics_1.transformDimming(pilot));
    if (util_1.isTW(device) || util_1.isRGB(device)) {
        let useCT = true;
        if (!(pilot instanceof Error) && pilot.sceneId && pilot.sceneId > 0) {
            useCT = false;
        }
        if (useCT) {
            service
                .getCharacteristic(wiz.Characteristic.ColorTemperature)
                .updateValue(pilot instanceof Error ? pilot : characteristics_1.transformTemperature(pilot));
        }
    }
    if (util_1.isRGB(device)) {
        service
            .getCharacteristic(wiz.Characteristic.Hue)
            .updateValue(pilot instanceof Error ? pilot : characteristics_1.transformHue(pilot));
        service
            .getCharacteristic(wiz.Characteristic.Saturation)
            .updateValue(pilot instanceof Error ? pilot : characteristics_1.transformSaturation(pilot));
    }
    const scenesService = accessory.getService(Service.Television);
    if (scenesService != null) {
        scenesService
            .getCharacteristic(wiz.Characteristic.Active)
            .updateValue(pilot instanceof Error ? pilot : characteristics_1.transformOnOff(pilot));
        scenesService
            .getCharacteristic(wiz.Characteristic.ActiveIdentifier)
            .updateValue(pilot instanceof Error ? pilot : scenes_1.transformEffectId(pilot));
    }
}
// Write a custom getPilot/setPilot that takes this
// caching into account
function getPilot(wiz, accessory, device, onSuccess, onError) {
    const { Service } = wiz;
    const service = accessory.getService(Service.Lightbulb);
    let callbacked = false;
    const onDone = (error, pilot) => {
        var _a, _b;
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
        const old = exports.cachedPilot[device.mac];
        if (typeof old !== "undefined" &&
            (pilot.sceneId !== 0 ||
                pilot.r !== old.r ||
                pilot.g !== old.g ||
                pilot.b !== old.b ||
                pilot.temp !== old.temp)) {
            (_a = exports.disabledAdaptiveLightingCallback[device.mac]) === null || _a === void 0 ? void 0 : _a.call(exports.disabledAdaptiveLightingCallback);
        }
        exports.cachedPilot[device.mac] = {
            // if no dimming info provided, use the last known on/off state
            dimming: ((_b = pilot.state) !== null && _b !== void 0 ? _b : old.state) ? 100 : 10,
            ...pilot
        };
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
function setPilot(wiz, accessory, device, pilot, callback) {
    var _a, _b;
    const oldPilot = exports.cachedPilot[device.mac];
    if (typeof oldPilot == "undefined") {
        return;
    }
    const newPilot = {
        ...oldPilot,
        state: (_a = oldPilot.state) !== null && _a !== void 0 ? _a : false,
        dimming: (_b = oldPilot.dimming) !== null && _b !== void 0 ? _b : 10,
        ...pilot,
    };
    if (pilot.sceneId !== undefined) {
        newPilot.temp = undefined;
        newPilot.r = undefined;
        newPilot.g = undefined;
        newPilot.b = undefined;
    }
    else if (newPilot.r || newPilot.g || newPilot.b || newPilot.temp) {
        newPilot.sceneId = undefined;
        newPilot.speed = undefined;
    }
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
function pilotToColor(pilot) {
    if (typeof pilot.temp === "number") {
        return {
            ...color_1.rgbToHsv(color_1.colorTemperature2rgb(Number(pilot.temp))),
            temp: Number(pilot.temp),
        };
    }
    const rgb = color_1.clampRgb({
        r: Number(pilot.r) || 0,
        g: Number(pilot.g) || 0,
        b: Number(pilot.b) || 0,
    });
    return { ...color_1.rgbToHsv(rgb), temp: color_1.rgb2colorTemperature(rgb) };
}
exports.pilotToColor = pilotToColor;
// Need to update hue, saturation, and temp when ANY of these change
function updateColorTemp(device, accessory, wiz, next) {
    const { Service } = wiz;
    const service = accessory.getService(Service.Lightbulb);
    return (error) => {
        if (util_1.isTW(device) || util_1.isRGB(device)) {
            if (error === null) {
                const color = pilotToColor(exports.cachedPilot[device.mac]);
                service
                    .getCharacteristic(wiz.Characteristic.ColorTemperature)
                    .updateValue(color_1.kelvinToMired(color.temp));
                if (util_1.isRGB(device)) {
                    service
                        .getCharacteristic(wiz.Characteristic.Saturation)
                        .updateValue(color.saturation);
                    service
                        .getCharacteristic(wiz.Characteristic.Hue)
                        .updateValue(color.hue);
                }
            }
        }
        next(error);
    };
}
exports.updateColorTemp = updateColorTemp;
//# sourceMappingURL=pilot.js.map