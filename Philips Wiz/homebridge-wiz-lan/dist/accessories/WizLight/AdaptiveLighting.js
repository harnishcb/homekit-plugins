"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAdaptiveLighting = void 0;
const logger_1 = require("../../util/logger");
const pilot_1 = require("./pilot");
function initAdaptiveLighting(wiz, service, accessory, device) {
    const log = logger_1.makeLogger(wiz, "Adaptive Lighting");
    log.debug(`Initializing adaptive lighting for ${device.mac}`);
    const controller = new wiz.api.hap.AdaptiveLightingController(service, {
        controllerMode: 1 /* AUTOMATIC */,
    });
    accessory.configureController(controller);
    pilot_1.disabledAdaptiveLightingCallback[device.mac] = () => {
        if (controller.isAdaptiveLightingActive()) {
            log.debug(`Disabling adaptive lighting for ${device.mac}`);
            controller.disableAdaptiveLighting();
        }
    };
    // we want to check if we should disable adaptive lighting due to an external change
    // every time before it updates
    let timeout = null;
    const temperature = service.getCharacteristic(wiz.Characteristic.ColorTemperature);
    const checkIfDisableAdaptiveLighting = () => {
        log.debug(`Checking if ${device.mac} changed before adaptive lighting update`);
        // get pilot will disable for us :)
        pilot_1.getPilot(wiz, accessory, device, () => { }, () => { });
    };
    temperature.on("set", () => {
        if (controller.isAdaptiveLightingActive()) {
            if (timeout !== null)
                clearTimeout(timeout);
            // try to check if we should disable adaptive lighting 2s before the next update
            const wait = controller.getAdaptiveLightingUpdateInterval() - 2000;
            timeout = setTimeout(checkIfDisableAdaptiveLighting, wait);
            log.debug(`Detected temperature update for ${device.mac}, checking adaptive lighting eligibilty in ${wait}ms`);
        }
    });
    controller.on("disable", () => {
        if (timeout !== null)
            clearTimeout(timeout);
    });
}
exports.initAdaptiveLighting = initAdaptiveLighting;
//# sourceMappingURL=AdaptiveLighting.js.map