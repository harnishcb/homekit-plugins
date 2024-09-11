"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.turnOffIfNeeded = exports.isTW = exports.isRGB = void 0;
function isRGB(device) {
    return device.model.includes("RGB");
}
exports.isRGB = isRGB;
function isTW(device) {
    return device.model.includes("SHTW");
}
exports.isTW = isTW;
function turnOffIfNeeded(characteristic, service, useSetValue = false) {
    const ch = service.getCharacteristic(characteristic);
    if ((ch === null || ch === void 0 ? void 0 : ch.value) !== 0) {
        useSetValue ? ch.setValue(0) : ch.updateValue(0);
    }
}
exports.turnOffIfNeeded = turnOffIfNeeded;
//# sourceMappingURL=util.js.map