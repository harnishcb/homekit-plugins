"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardedClient = void 0;
const ws_1 = __importDefault(require("ws"));
const Logger_1 = require("freeathome-api/dist/lib/Logger");
class GuardedClient {
    constructor(errorSubscriber, options, logger) {
        this.logger = new Logger_1.ConsoleLogger();
        this._bwaToken = "";
        this._wsURL = "";
        this._bwaToken = Buffer.from(options['username'] + ':' + options['password']).toString('base64');
        this._wsURL = options['service'];
        this.client = this.createWebsocket();
        this.errorSubscriber = errorSubscriber;
        if (logger !== undefined && logger !== null) {
            this.logger = logger;
        }
    }
    createWebsocket() {
        return new ws_1.default(this._wsURL, {
            protocolVersion: 13,
            rejectUnauthorized: false,
            headers: {
                "Authorization": "Basic " + this.getBWAToken()
            }
        });
    }
    restartSocket() {
        this.terminate();
        this.client = this.createWebsocket();
    }
    getBWAToken() {
        return this._bwaToken;
    }
    on(event, fn) {
        this.logger.debug("GuardedClient ON: " + event);
        this.client.on(event, fn);
    }
    guardedOn(event, fn) {
        const guardedFn = (a) => __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.debug("this.client.readyState:" + this.client.readyState);
                yield fn(a);
            }
            catch (err) {
                this.logger.error(`Unexpected error while processing ${event} event`, err);
                this.broadCastError(err);
            }
        });
        this.client.on(event, guardedFn);
    }
    send(stanza) {
        this.logger.debug("*** WS send() ***");
        return new Promise((resolve, reject) => {
            this.client.send(stanza);
            resolve();
        });
    }
    ping() {
        return new Promise((resolve, reject) => {
            this.logger.debug("*** PING ***");
            resolve();
        });
    }
    pong() {
        return new Promise((resolve, reject) => {
            this.logger.debug("*** WS PONG ***");
            resolve();
        });
    }
    start() {
        this.logger.debug("*** WS start ***");
        return new Promise((resolve, reject) => {
            if (this.client.readyState === ws_1.default.OPEN) {
                resolve();
            }
            else {
                resolve();
            }
        });
    }
    stop() {
        return new Promise((resolve, reject) => {
            if (this.client.readyState === ws_1.default.OPEN) {
                this.client.terminate();
                resolve();
            }
            else {
                resolve();
            }
        });
    }
    terminate() {
        return new Promise((resolve, reject) => {
            this.client.terminate();
            resolve();
        });
    }
    broadCastError(err) {
        this.errorSubscriber.broadcastMessage({
            type: "error",
            result: {
                message: err.message,
                error: err
            }
        });
    }
}
exports.GuardedClient = GuardedClient;
