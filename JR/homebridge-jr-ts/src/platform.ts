import {
    API,
    APIEvent,
    DynamicPlatformPlugin,
    Logger,
    PlatformAccessory,
    PlatformConfig,
    UnknownContext,
} from "homebridge";
import { Socket } from "net";
import { JRAccessory } from "./JRAccessory.js";
import { JRAccessoryConfig, JRPanelConfig, JRPlatformAccessory, JRPlatformConfig } from "./model/ConfigModel.js";
import { DT, JR_CONN_DEFAULT_PORT } from "./model/JRModel.js";
import { PLATFORM_NAME, PLUGIN_NAME } from "./settings.js";

class JR implements DynamicPlatformPlugin {

    private readonly accessories: JRPlatformAccessory[] = [];
    config: JRPlatformConfig;

    identifiers: string[] = [];
    jrAccessoriesConfigs: JRAccessoryConfig[] = [];
    private readonly JRAccessories: JRAccessory[] = [];

    constructor(
        readonly log: Logger,
        config: PlatformConfig,
        readonly api: API,
    ) {
        this.config = config as JRPlatformConfig;

        this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
            this.discoverAccessories();
        });
    }

    // configures all accessory form cache and new accessories
    configureAccessory(accessory: PlatformAccessory<UnknownContext>): void {
        accessory.context.reviewed = false;
        this.accessories.push(accessory as JRPlatformAccessory);
    }

    // Start discovery for all config mention in config.json
    private discoverAccessories(): void {
        for (const panelConfig of this.config.accessories) {
            //After accessories are configured then Initialize for HomeKit.
            this.configureJR(panelConfig).then(() => this.initJR(this.jrAccessoriesConfigs.filter((e) => {
                return e.host === panelConfig.host;
            }))).catch((e: Error) => this.log.error(e.message));
        }
    }

    // Configure panel wise accessory
    private async configureJR(panelConfig: JRPanelConfig): Promise<void> {
        try {
            // get connected client
            const infoClient = await this.openClientConnection(panelConfig.host);

            // get data
            const data = await this.getClientData(infoClient, 100);

            infoClient.removeListener("error", () => this.log.warn("remove listener"));

            const devices = data.identifier.split("_");

            this.log.info(`[DEBUG-JR] Connected ${infoClient.remoteAddress!}`);

            // Separate all accessories
            for (const device of devices) {
                // find category and it's type
                const category = String(device.match(/[A-Z]/g)?.join(""));
                const module = Number(device.match(/[0-9]/g)?.join(""));
                // this.log.warn(`[DEBUG-JR] Category: ${category} Module: ${module}`);

                const getDP = (category: string): number => {
                    /**
                     * See: assets/Touch Switches API_server.pdf pg:7
                     * Switch : 108 -> 117
                     * Fan : 118 -> 119
                     * Dimmer : 120 -> 123
                     * Curtain : 124 & 126
                     */
                    switch (category) {
                        case "S":
                            return 108;
                        case "F":
                            return 118;
                        case "D":
                            return 120;
                        case "CC":
                            return 124;
                        default:
                            this.log.debug(`[DEBUG-JR] ${category} does not exist.`);
                            return -1;
                    }
                };

                const getIdentifier = (category: string, idx: number): string => {
                    /**
                    * See: assets/Touch Switches API_server.pdf pg: 7
                    */
                    switch (category) {
                        case "S":
                            return `switch_${idx + 1}`;
                        case "F":
                            return `fan_${idx + 1}`;
                        case "D":
                            return `dimmer_${idx + 1}`;
                        case "CC":
                            return `cc${idx + 1}_level`;
                        default:
                            this.log.debug(`[DEBUG-JR] ${category} does not exist.`);
                            return "";
                    }
                };

                // setup up different config for devices
                for (let i = 0; i < module; i++) {
                    const deviceConfig: JRAccessoryConfig = {
                        name: panelConfig.name,
                        host: panelConfig.host,
                        dp_id: getDP(category) + i,
                        dp_identifier: getIdentifier(category, i),
                        category: category,
                        client: infoClient,
                        panel: data.identifier,
                    };

                    // this.log.debug(`[DEBUG-JR] ${JSON.stringify(deviceConfig)}`);
                    this.jrAccessoriesConfigs.push(deviceConfig);
                }
            }

            // for destroy client
            // setTimeout(() => infoClient.destroy(), 60000);
        } catch (e) {
            if (e instanceof Error) {
                this.log.error(e.message);
            }
        }
    }

    /**
     * Make sure connection is establish
     */
    private async openClientConnection(host: string): Promise<Socket> {
        const client = new Socket();
        return new Promise((res) => {
            client.connect({ port: JR_CONN_DEFAULT_PORT, host: host }, () => res(client));
            this.clientSocketEvents(client, host);
        });
    }

    /**
     *
     * @param client Socket connection
     * @param dp get information for specific DP
     * @returns data
     */
    private async getClientData(client: Socket, dp: number): Promise<DT> {
        return new Promise((res) => {
            client.write(`{"get":[{"dp_id":${dp}}]}\r\n`);
            client.on("data", (stream) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const response = JSON.parse(stream.toString()).report[0] as DT;
                    if (response.dp_id === dp) {
                        res(response);
                    }
                } catch (e) {
                    if (e instanceof Error) {
                        this.log.error(e.message);
                    }
                }
            });
        });
    }

    // Initialize all accessories
    private initJR(configs: JRAccessoryConfig[]) {
        configs.forEach((config) => {
            const temp_displayName = `${config.name} ${config.dp_identifier.replace("_", " ")}`;
            const uuid = this.api.hap.uuid.generate(`${PLATFORM_NAME}.${config.name}.${config.dp_identifier}`);

            const existingAccessory = this.accessories.find(a => a.UUID === uuid);

            if (existingAccessory) {
                this.log.info(`Caching ${existingAccessory.displayName}`);
                this.JRAccessories.push(new JRAccessory(existingAccessory, this.log, this.api, config));
                existingAccessory.context.reviewed = true;

            } else {
                this.log.info(`Adding new accessory : ${temp_displayName}`);
                const accessory = new this.api.platformAccessory(temp_displayName, uuid);
                this.JRAccessories.push(new JRAccessory(accessory as JRPlatformAccessory, this.log, this.api, config));
                accessory.context.reviewed = true;
                this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
        });

        this.accessories.forEach((a) => {
            if (!a.context.reviewed) {
              this.removeAccessory(a);
            }
        });
    }


    // handle TCP/IP events
    private clientSocketEvents(client: Socket, host: string) {
        // handle error
        client.on("error", (err: Error) => {
            this.log.error(`[DEBUG] JR Connection Error : ${err.message}`);
            setTimeout(() => client.connect({ port: JR_CONN_DEFAULT_PORT, host: host }), 10000);
        });

        // handle close
        client.on("close", () => {
            this.log.debug(`[DEBUG] JR Connection closed ${client.remoteAddress!}`);
        });
    }

    removeAccessory(accessory: any) {
        this.log.info('Remove accessory: ', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.forEach((element, index) => {
          if (element.UUID === accessory.uuid) {
            this.accessories.splice(index, 1);
          }
        });
      }
}

export { JR };