import { API } from 'homebridge';
import { OneTouch } from './platform.js';

import { PLATFORM_NAME } from './settings.js';

/**
 * Starting file it registers the platform to the homebridge.
 * 
 * Don't require any changes for most of the case.
 */

export default (api: API) => {
    api.registerPlatform(PLATFORM_NAME, OneTouch);
};