"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDiscoveryBroadcast = exports.registerDiscoveryHandler = exports.bindSocket = exports.createSocket = exports.setPilot = exports.getPilot = void 0;
const dgram_1 = __importDefault(require("dgram"));
const getmac_1 = __importDefault(require("getmac"));
const internal_ip_1 = __importDefault(require("internal-ip"));
const logger_1 = require("./logger");
function strMac() {
    return getmac_1.default().toUpperCase().replace(/:/g, "");
}
function strIp() {
    var _a;
    return (_a = internal_ip_1.default.v4.sync()) !== null && _a !== void 0 ? _a : "0.0.0.0";
}
const BROADCAST_PORT = 38899;
function getNetworkConfig({ config }) {
    var _a, _b, _c, _d;
    return {
        ADDRESS: (_a = config.address) !== null && _a !== void 0 ? _a : strIp(),
        PORT: (_b = config.port) !== null && _b !== void 0 ? _b : 38900,
        BROADCAST: (_c = config.broadcast) !== null && _c !== void 0 ? _c : "255.255.255.255",
        MAC: (_d = config.mac) !== null && _d !== void 0 ? _d : strMac(),
    };
}
const getPilotQueue = {};
const getPilotDebounce = {};
function getPilot(wiz, device, callback) {
    var _a, _b;
    const timeout = setTimeout(() => {
        const { callbacks } = getPilotDebounce[device.mac];
        getPilotInternal(wiz, device, (error, pilot) => {
            callbacks.map((cb) => cb(error, pilot));
        });
        delete getPilotDebounce[device.mac];
    }, 50);
    if (device.mac in getPilotDebounce) {
        clearTimeout(getPilotDebounce[device.mac].timeout);
    }
    getPilotDebounce[device.mac] = {
        timeout,
        callbacks: [callback, ...((_b = (_a = getPilotDebounce[device.mac]) === null || _a === void 0 ? void 0 : _a.callbacks) !== null && _b !== void 0 ? _b : [])],
    };
}
exports.getPilot = getPilot;
function getPilotInternal(wiz, device, callback) {
    if (device.mac in getPilotQueue) {
        getPilotQueue[device.mac].push(callback);
    }
    else {
        getPilotQueue[device.mac] = [callback];
    }
    wiz.log.debug(`[getPilot] Sending getPilot to ${device.mac}`);
    wiz.socket.send(`{"method":"getPilot","params":{}}`, BROADCAST_PORT, device.ip, (error) => {
        if (error !== null && device.mac in getPilotQueue) {
            wiz.log.debug(`[Socket] Failed to send getPilot response to ${device.mac}: ${error.toString()}`);
            const callbacks = getPilotQueue[device.mac];
            delete getPilotQueue[device.mac];
            callbacks.map((f) => f(error, null));
        }
    });
}
const setPilotQueue = {};
function setPilot(wiz, device, pilot, callback) {
    if (wiz.config.lastStatus) {
        // Keep only the settings that cannot change the bulb color
        Object.keys(pilot).forEach((key) => {
            if (['sceneId', 'speed', 'temp', 'dimming', 'r', 'g', 'b'].includes(key)) {
                delete pilot[key];
            }
        });
    }
    const msg = JSON.stringify({
        method: "setPilot",
        env: "pro",
        params: Object.assign({
            mac: device.mac,
            src: "udp",
        }, pilot),
    });
    if (device.ip in setPilotQueue) {
        setPilotQueue[device.ip].push(callback);
    }
    else {
        setPilotQueue[device.ip] = [callback];
    }
    wiz.log.debug(`[SetPilot][${device.ip}:${BROADCAST_PORT}] ${msg}`);
    wiz.socket.send(msg, BROADCAST_PORT, device.ip, (error) => {
        if (error !== null && device.mac in setPilotQueue) {
            wiz.log.debug(`[Socket] Failed to send setPilot response to ${device.mac}: ${error.toString()}`);
            const callbacks = setPilotQueue[device.mac];
            delete setPilotQueue[device.mac];
            callbacks.map((f) => f(error));
        }
    });
}
exports.setPilot = setPilot;
function createSocket(wiz) {
    const log = logger_1.makeLogger(wiz, "Socket");
    const socket = dgram_1.default.createSocket("udp4");
    socket.on("error", (err) => {
        log.error(`UDP Error: ${err}`);
    });
    socket.on("message", (msg, rinfo) => {
        const decryptedMsg = msg.toString("utf8");
        log.debug(`[${rinfo.address}:${rinfo.port}] Received message: ${decryptedMsg}`);
    });
    wiz.api.on("shutdown", () => {
        log.debug("Shutting down socket");
        socket.close();
    });
    return socket;
}
exports.createSocket = createSocket;
function bindSocket(wiz, onReady) {
    const log = logger_1.makeLogger(wiz, "Socket");
    const { PORT, ADDRESS } = getNetworkConfig(wiz);
    log.info(`Setting up socket on ${ADDRESS !== null && ADDRESS !== void 0 ? ADDRESS : "0.0.0.0"}:${PORT}`);
    wiz.socket.bind(PORT, ADDRESS, () => {
        const sockAddress = wiz.socket.address();
        log.debug(`Socket Bound: UDP ${sockAddress.family} listening on ${sockAddress.address}:${sockAddress.port}`);
        wiz.socket.setBroadcast(true);
        onReady();
    });
}
exports.bindSocket = bindSocket;
function registerDiscoveryHandler(wiz, addDevice) {
    const log = logger_1.makeLogger(wiz, "Discovery");
    log.debug("Initiating discovery handlers");
    try {
        wiz.socket.on("message", (msg, rinfo) => {
            const decryptedMsg = msg.toString("utf8");
            let response;
            const ip = rinfo.address;
            try {
                response = JSON.parse(decryptedMsg);
            }
            catch (err) {
                log.debug(`Error parsing JSON: ${err}\nFrom: ${rinfo.address} ${rinfo.port} Original: [${msg}] Decrypted: [${decryptedMsg}]`);
                return;
            }
            if (response.method === "registration") {
                const mac = response.result.mac;
                log.debug(`[${ip}@${mac}] Sending config request (getSystemConfig)`);
                // Send system config request
                wiz.socket.send(`{"method":"getSystemConfig","params":{}}`, BROADCAST_PORT, ip);
            }
            else if (response.method === "getSystemConfig") {
                const mac = response.result.mac;
                log.debug(`[${ip}@${mac}] Received config`);
                addDevice({
                    ip,
                    mac,
                    model: response.result.moduleName,
                });
            }
            else if (response.method === "getPilot") {
                const mac = response.result.mac;
                if (mac in getPilotQueue) {
                    const callbacks = getPilotQueue[mac];
                    delete getPilotQueue[mac];
                    callbacks.map((f) => f(null, response.result));
                }
            }
            else if (response.method === "setPilot") {
                const ip = rinfo.address;
                if (ip in setPilotQueue) {
                    const callbacks = setPilotQueue[ip];
                    delete setPilotQueue[ip];
                    callbacks.map((f) => f(response.error ? new Error(response.error.toString()) : null));
                }
            }
        });
    }
    catch (err) {
        log.error(`Error: ${err}`);
    }
}
exports.registerDiscoveryHandler = registerDiscoveryHandler;
function sendDiscoveryBroadcast(service) {
    const { ADDRESS, MAC, BROADCAST } = getNetworkConfig(service);
    const log = logger_1.makeLogger(service, "Discovery");
    log.info(`Sending discovery UDP broadcast to ${BROADCAST}:${BROADCAST_PORT}`);
    // Send generic discovery message
    service.socket.send(`{"method":"registration","params":{"phoneMac":"${MAC}","register":false,"phoneIp":"${ADDRESS}"}}`, BROADCAST_PORT, BROADCAST);
    // Send discovery message to listed devices
    if (Array.isArray(service.config.devices)) {
        for (const device of service.config.devices) {
            if (device.host) {
                log.info(`Sending discovery UDP broadcast to ${device.host}:${BROADCAST_PORT}`);
                service.socket.send(`{"method":"registration","params":{"phoneMac":"${MAC}","register":false,"phoneIp":"${ADDRESS}"}}`, BROADCAST_PORT, device.host);
            }
        }
    }
}
exports.sendDiscoveryBroadcast = sendDiscoveryBroadcast;
//# sourceMappingURL=network.js.map