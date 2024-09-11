import { API } from "homebridge";
import { JR } from "./platform.js";

import { PLATFORM_NAME, PLUGIN_NAME } from "./settings.js";

/**
 * Starting file it registers the platform to the homebridge.
 *
 * Don't require any changes for most of the case.
 */

export default (api: API) => {
    api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, JR);
};