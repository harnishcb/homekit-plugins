"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLogger = void 0;
function makeLogger({ log }, prefix) {
    const format = (msg) => `[${prefix}] ${msg}`;
    return {
        debug: (msg) => log.debug(format(msg)),
        info: (msg) => log.info(format(msg)),
        warn: (msg) => log.warn(format(msg)),
        error: (msg) => log.error(format(msg)),
    };
}
exports.makeLogger = makeLogger;
//# sourceMappingURL=logger.js.map