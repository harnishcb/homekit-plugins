"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const pilot_1 = require("./pilot");
const characteristics_1 = require("./characteristics");
class WizSocket extends __1.WizAccessory {
    constructor() {
        super(...arguments);
        this.init = () => {
            const { wiz, accessory, device } = this;
            const { Service } = wiz;
            // Setup the outlet service
            let service = accessory.getService(Service.Outlet);
            if (typeof service === "undefined") {
                service = new Service.Outlet(accessory.displayName);
                accessory.addService(service);
            }
            // All bulbs support on/off + dimming
            characteristics_1.initOnOff(accessory, device, wiz);
        };
        this.getPilot = () => {
            return new Promise((resolve, reject) => {
                pilot_1.getPilot(this.wiz, this.accessory, this.device, resolve, reject);
            });
        };
    }
}
WizSocket.is = (device) => ["ESP10_SOCKET_06", "ESP25_SOCKET_01"].some((id) => device.model.includes(id));
WizSocket.getName = (_) => {
    return "Wiz Socket";
};
exports.default = WizSocket;
//# sourceMappingURL=index.js.map