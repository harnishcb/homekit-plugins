import { API, Logger } from "homebridge";
import { Socket } from "node:net";
import { JRAccessoryConfig, JRPlatformAccessory } from "./model/ConfigModel.js";
import { DT, JR_CONN_DEFAULT_PORT } from "./model/JRModel.js";
import { AbstractService } from "./services/AbstractService.js";
import { Lightbulb } from "./services/Dimmer.js";
import { Fan } from "./services/Fanv2.js";
import { Switch } from "./services/Switch.js";
import { Curtain } from "./services/WindowCovering.js";
import { PLATFORM_NAME } from "./settings.js";

const wait = (t = 3000) => {
    return new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, t);
    });
};

class JRAccessory {
    private services: AbstractService[] = [];

    public isConnected = true;
    public client: Socket;
    public readonly uuid: string;
    public readonly displayName: string;

    constructor(
        readonly accessory: JRPlatformAccessory,
        readonly log: Logger,
        readonly api: API,
        readonly config: JRAccessoryConfig,
    ) {
        this.uuid = this.getAccessoryUUID(config);
        this.displayName = this.getAccessoryDisplayName(config);

        this.client = config.client;

        this.clientSocketEvents(this.client);

        this.runServices(accessory);

        setInterval(() => {
            const cmd = {
                get: [
                    {
                        dp_id: config.dp_id,
                    },
                ],
            };
            this.client.write(`${JSON.stringify(cmd)}\r\n`);
        }, 30000);

        setInterval(() => {
            this.api.updatePlatformAccessories([accessory]);
            this.checkConnection();
        }, 10000);
    }

    // Get UUID
    private getAccessoryUUID(config: JRAccessoryConfig): string {
        return this.api.hap.uuid.generate(`${PLATFORM_NAME}.${config.name}.${config.dp_identifier}`);
    }

    // Get Display Name
    private getAccessoryDisplayName(config: JRAccessoryConfig): string {
        return `${config.name} ${config.dp_identifier.replace("_", " ")}`;
    }

    private runServices(accessory: JRPlatformAccessory): void {
        switch (this.config.category) {
            case "S":
                this.services.push(new Switch(this, this.api, this.log, accessory, this.config, this.client));
                break;
            case "F":
                this.services.push(new Fan(this, this.api, this.log, accessory, this.config, this.client));
                break;
            case "D":
                this.services.push(new Lightbulb(this, this.api, this.log, accessory, this.config, this.client));
                break;
            case "CC":
                this.services.push(new Curtain(this, this.api, this.log, accessory, this.config, this.client));
                break;
            default:
                this.log.error(`${this.config.category} is not available`);
                break;
        }
    }

    // Handle socket events
    private clientSocketEvents(client: Socket) {
        client.on("ready", () => {
            this.isConnected = true;
            this.log.debug(`[DEBUG-JR] Connected 
            ${client.localAddress!}:${client.localPort!}->${client.remoteAddress!}:${client.remotePort!}`);
        });

        // handle error
        client.on("error", (err: Error) => {
            this.isConnected = false;
            this.log.debug(`[DEBUG] JR Connection Error : ${err.message}`);
        });

        client.setKeepAlive(true, 5000);

        // handle close
        client.on("close", () => {
            this.log.debug("[DEBUG-JR] Connection Closed.");
            this.isConnected = false;
            this.log.debug(`Reconnecting... ${this.config.host}`);
        });
    }

    // check heart beat of panel
    // not used but for debugging purpose
    private async getHeartRate(dp: number): Promise<boolean> {
        return new Promise((res, rej) => {
            this.client.write(`{"get":[{"dp_id":${dp}}]}\r\n`);
            this.client.on("data", (stream) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const response = JSON.parse(stream.toString()).report[0] as DT;
                    if (response.dp_id === dp) {
                        res(true);
                    }
                } catch (e) {
                    if (e instanceof Error) {
                        this.log.error(e.message);
                        rej(false);
                    }
                }
            });

            wait(5000).then(() => res(false)).catch((e: Error) => this.log.error(e.message));
        });
    }

    // for check connection an reconnecting
    private checkConnection() {
        if (!this.isConnected) {
            this.client.connect({ port: JR_CONN_DEFAULT_PORT, host: this.config.host });
        }
    }
}

export { JRAccessory };