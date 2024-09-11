import { PlatformAccessory, PlatformConfig } from "homebridge";
import { Socket } from "node:net";

type JRPanelConfig = {
    name: string,
    host: string,
}

type JRAccessoryConfig = {
    name: string,
    host: string,
    dp_id: number,
    dp_identifier: string,
    category: string,
    client: Socket,
    panel: string,
}

type JRPlatformAccessory = PlatformAccessory<JRPanelConfig>

interface JRPlatformConfig extends PlatformConfig {
    accessories: JRPanelConfig[],
}

export type { JRAccessoryConfig, JRPlatformAccessory, JRPlatformConfig, JRPanelConfig }