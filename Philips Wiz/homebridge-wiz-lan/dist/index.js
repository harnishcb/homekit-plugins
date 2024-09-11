"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const constants_1 = require("./constants");
const wiz_1 = __importDefault(require("./wiz"));
module.exports = (api) => {
    api.registerPlatform(constants_1.PLUGIN_NAME, wiz_1.default);
};
//# sourceMappingURL=index.js.map