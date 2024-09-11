"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScenes = exports.transformEffectId = void 0;
const pilot_1 = require("../pilot");
const util_1 = require("../util");
const _1 = require(".");
const SCENES = [
    ["No Scene", ["RGB", "DW", "TW"]],
    ["Ocean", ["RGB"]],
    ["Romance", ["RGB"]],
    ["Sunset", ["RGB"]],
    ["Party", ["RGB"]],
    ["Fireplace", ["RGB"]],
    ["Cozy", ["RGB", "TW"]],
    ["Forest", ["RGB"]],
    ["Pastel Colors", ["RGB"]],
    ["Wake up", ["RGB", "DW", "TW"]],
    ["Bedtime", ["RGB", "DW", "TW"]],
    ["Warm White", ["RGB", "TW"]],
    ["Daylight", ["RGB", "TW"]],
    ["Cool white", ["RGB", "DW", "TW"]],
    ["Night light", ["RGB", "DW", "TW"]],
    ["Focus", ["RGB", "TW"]],
    ["Relax", ["RGB", "TW"]],
    ["True colors", ["RGB"]],
    ["TV time", ["RGB", "TW"]],
    ["Plantgrowth", ["RGB"]],
    ["Spring", ["RGB"]],
    ["Summer", ["RGB"]],
    ["Fall", ["RGB"]],
    ["Deepdive", ["RGB"]],
    ["Jungle", ["RGB"]],
    ["Mojito", ["RGB"]],
    ["Club", ["RGB"]],
    ["Christmas", ["RGB"]],
    ["Halloween", ["RGB"]],
    ["Candlelight", ["RGB", "DW", "TW"]],
    ["Golden white", ["RGB", "DW", "TW"]],
    ["Pulse", ["RGB", "DW", "TW"]],
    ["Steampunk", ["RGB", "DW", "TW"]],
];
function getScenes(type) {
    return SCENES.map((scene, idx) => ({ idx, scene }))
        .filter((item) => item.scene[1].includes(type))
        .map((item) => item.idx);
}
/**
 * Returns supported scenes for device. Based on https://bit.ly/3hLImPa.
 * @param device
 * @return array of ids of scenes supported by the particular light type
 */
function supportedScenesIdsForDevice(device) {
    if (util_1.isTW(device))
        return getScenes("TW");
    else if (util_1.isRGB(device))
        return getScenes("RGB");
    return getScenes("DW");
}
function transformEffectId(pilot) {
    var _a;
    return (_a = pilot.sceneId) !== null && _a !== void 0 ? _a : 0;
}
exports.transformEffectId = transformEffectId;
function initScenes(wiz, accessory, device) {
    const { Characteristic, Service, config } = wiz;
    let scenesService = accessory.getService(Service.Television);
    const lightbulbService = accessory.getService(Service.Lightbulb);
    if (config.enableScenes !== true) {
        if (scenesService != null) {
            accessory.removeService(scenesService);
        }
        accessory.services
            .filter((service) => service.subtype != null)
            .forEach(service => accessory.removeService(service));
        return;
    }
    if (scenesService == null) {
        scenesService = new Service.Television(accessory.displayName);
        accessory.addService(scenesService);
    }
    scenesService
        .getCharacteristic(Characteristic.ActiveIdentifier)
        .on("get", (callback) => pilot_1.getPilot(wiz, accessory, device, (pilot) => callback(null, transformEffectId(pilot)), callback))
        .on("set", (newValue, next) => {
        const sceneId = Number(newValue);
        if (sceneId === 0) {
            // set to white if no scene
            pilot_1.setPilot(wiz, accessory, device, { temp: 3000 }, next);
        }
        else {
            pilot_1.setPilot(wiz, accessory, device, { sceneId }, next);
            if (sceneId !== 0)
                device.lastSelectedSceneId = sceneId;
        }
    });
    scenesService
        .getCharacteristic(Characteristic.Active)
        .on("get", (callback) => pilot_1.getPilot(wiz, accessory, device, (pilot) => callback(null, _1.transformOnOff(pilot)), callback))
        .on("set", (newValue, next) => {
        const value = Boolean(newValue);
        lightbulbService
            .getCharacteristic(Characteristic.On)
            .updateValue(value);
        pilot_1.setPilot(wiz, accessory, device, { state: value }, next);
    });
    lightbulbService
        .getCharacteristic(Characteristic.Active)
        .on("set", (newValue, next) => {
        const value = Boolean(newValue);
        scenesService
            .getCharacteristic(Characteristic.Active)
            .updateValue(value);
        next();
    });
    const turnOff = (_, _next) => {
        scenesService
            .getCharacteristic(Characteristic.ActiveIdentifier)
            .updateValue(0);
    };
    lightbulbService
        .getCharacteristic(Characteristic.Saturation)
        .on("set", turnOff);
    lightbulbService.getCharacteristic(Characteristic.Hue).on("set", turnOff);
    lightbulbService
        .getCharacteristic(Characteristic.ColorTemperature)
        .on("set", turnOff);
    const configureInputSource = (sceneId, service) => {
        const sceneName = SCENES[sceneId][0];
        service
            .setCharacteristic(Characteristic.Identifier, sceneId)
            .setCharacteristic(Characteristic.ConfiguredName, sceneName)
            .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
            .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.HDMI);
        scenesService.addLinkedService(service);
    };
    const supportedSceneIds = supportedScenesIdsForDevice(device);
    // remove any scenes that should not exist
    const existingSceneIds = accessory.services
        .filter((service) => service.subtype != null)
        .map((service) => {
        const id = Number(service.getCharacteristic(Characteristic.Identifier).value);
        if (supportedSceneIds.includes(id)) {
            configureInputSource(id, service);
            return id;
        }
        else {
            accessory.removeService(service);
        }
        return null;
    });
    const missingSceneIds = supportedSceneIds.filter((id) => !existingSceneIds.includes(id));
    // now add any new ones
    missingSceneIds.forEach((sceneId) => {
        const sceneName = SCENES[sceneId][0];
        const service = accessory.addService(Service.InputSource, String(sceneId), sceneName);
        configureInputSource(sceneId, service);
    });
}
exports.initScenes = initScenes;
//# sourceMappingURL=scenes.js.map