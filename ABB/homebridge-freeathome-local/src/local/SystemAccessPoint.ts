import axios, { Axios } from "axios"
import compareVersions from "compare-versions"
import { SystemAccessPointSettings, SystemAccessPointUser } from "freeathome-api/dist/lib/SystemAccessPointSettings"
import { ClientConfiguration } from "freeathome-api/dist/lib/Configuration"
import { Subscriber } from "./Subscriber"
import { Logger, ConsoleLogger } from "freeathome-api/dist/lib/Logger"
import { GuardedClient } from './GuardedClient'
import { MessageBuilder } from './MessageBuilder'

const https = require('https');

export class SystemAccessPoint {
    private configuration: ClientConfiguration
    private readonly subscriber: Subscriber
    private client: GuardedClient | undefined
    private messageBuilder: MessageBuilder | undefined
    private online: boolean = false
    private settings: SystemAccessPointSettings | undefined
    private heartBeatRateMillis: number = 1000
    private keepAliveTimer: NodeJS.Timeout | null = null
    private heartBeatReconnectLimit: number = 10000 // 10s
    private heartBeatTimerMillis: number = 0
    private pingTimeout: NodeJS.Timeout | null = null

    private deviceData: any = {}
    private axios: Axios
    private logger: Logger = new ConsoleLogger()

    /**
     * ports will be set automagically (hopefully)
     */
    private _port = ''

    /**
     * the API entry path
     */
    private readonly _path2api = '/fhapi/v1/api'

    /**
     * default UUID - we will read the "real" uuid from config.json
     */
    private _uuid = '00000000-0000-0000-0000-000000000000'

    /**
     * minimal version to use the local API
    */
    private readonly _minversionAP = '2.6.0'

    constructor(configuration: ClientConfiguration, subscriber: Subscriber, logger: Logger | null) {
        this.configuration = configuration
        this.subscriber = subscriber
        //this.useTLS = subscriber.config.useTLS
        if (logger !== undefined && logger !== null) {
            this.logger = logger
        }
        let cfg: [] = this.subscriber.getConfig()
        if ('debug' in cfg && cfg['debug']) {
            this.logger.debugEnabled = true;
        }
        if ('reconnectLimit' in cfg && cfg['reconnectLimit'] && cfg['reconnectLimit']>5) {
            this.heartBeatReconnectLimit = cfg['reconnectLimit']*1000;
        }
         
        // ignore self signed certs at instance level
        this.axios = axios.create({
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });
    }

    /**
     * Create the Guarded Client and inititialize event handlers the HeartBeat timer
     */
    private async createClient() {
        this.settings = await this.getSettings()

        let user: SystemAccessPointUser | undefined

        for (let tempUser of this.settings.users) {
            if (tempUser.name == this.configuration.username) {
                user = tempUser
                break
            }
        }

        if (user === undefined) {
            this.logger.error('The user does not exist in the System Access Point\'s configuration')
            throw new Error(`User ${this.configuration.username} does not exist`)
        }

        this.user = user

        let username = user!.jid.split('@')[0]

        /**
         * private readonly _protocol1 = 'wss://'
         * private _port = ''
         * private readonly _path2api = '/fhapi/v1/api'
         */
        this.client = new GuardedClient(this.subscriber, {
            service: this.getProtocolWS() + this.configuration.hostname + ((this._port != '') ? ':' + this._port : '') + this._path2api + '/ws',
            from: this.configuration.hostname,
            resource: 'freeathome-api',
            username: username,
            password: this.configuration.password
        }, this.logger)

        this.messageBuilder = new MessageBuilder(username)
        this.registerHandlers()
        this.startHeartBeat()
    }

    private async getSettings(): Promise<SystemAccessPointSettings> {
        let response = await this.axios.get(this.getProtocolHTTP() + this.configuration.hostname + '/settings.json')

        if (response.status != 200) {
            this.logger.error("Unexpected status code from System Access Point while retrieving settings.json.")
            throw new Error("Unexpected status code from System Access Point while retrieving settings.json.")
        }

        if (!('flags' in response.data) || !('version' in response.data.flags)) {
            this.logger.error("Flags key does not exist in settings.json.")
            throw new Error("Flags key does not exist in settings.json.")
        }

        if (!('users' in response.data || !Array.isArray(response.data.users))) {
            this.logger.error("Users key does not exist in settings.json.")
            throw new Error("Users key does not exist in settings.json.")
        }

        return <SystemAccessPointSettings>response.data
    }

    private async getDeviceConfiguration(): Promise<any> {
        let _restpath = '/rest/configuration'
        let bwaToken = this.client!.getBWAToken()
        try {
            let response = await this.axios.get(this.getProtocolHTTP() + this.configuration.hostname + this._path2api + _restpath, {
                headers: { 'Authorization': 'Basic ' + bwaToken }
            })

            if (response.status != 200) {
                this.logger.error("Unexpected status code from System Access Point while retrieving " + _restpath)
                throw new Error("Unexpected status code from System Access Point while retrieving " + _restpath)
            }


            /**
             * retrieving the uuid from device config
             */
            this._uuid = Object.keys(response.data)[0] ?? this._uuid
            this.deviceData = response.data[this._uuid]?.devices

            this.subscriber.broadcastMessage({ result: response.data, type: 'subscribed' })
            return response.data
        }
        catch (e: any) {
            this.logger.error("Unexpected status code from System Access Point while retrieving " + _restpath + "\n" + e.toString());
            return null
        }

    }

    /**
     *     Register websocket event Handlers  
     *     onopen: (event: WebSocket.OpenEvent) => void;
     *     onerror: (event: WebSocket.ErrorEvent) => void;
     *     onclose: (event: WebSocket.CloseEvent) => void;
     *     onmessage: (event: WebSocket.MessageEvent) => void;
     */
    public registerHandlers() {
        if (this.client === undefined) {
            throw new Error("Unknown error occurred! this.client undefined.")
        }

        this.client.on('error', err => {
            this.logger.error(err.toString())
            this.subscriber.broadcastMessage({
                type: "error",
                result: err
            })
        })

        this.client.on('close', () => {
            this.logger.log('Access Point has gone offline')
            //this.online = false
            //this.subscribed = false
            this.subscriber.broadcastMessage({
                'type': 'subscribed',
                'result': false
            })
        })

        this.client.guardedOn('message', async stanza => {
            this.logger.debug('Received stanza:', JSON.parse(stanza))
            let astanza = JSON.parse(stanza)[this._uuid] ?? null
            this.resetHeartBeatTimer()
            if (astanza.datapoints) {
                this.handleEvent(astanza)
            }
        })

        this.client.on('open', async address => {
            //let connectedAs = 'Local API Websocket'
            //this.logger.log("Connected as " + connectedAs)
            //this.connectedAs = connectedAs

            this.logger.log("Retrieving configuration...")
            let deviceData = this.getDeviceConfiguration()
            this.resetHeartBeatTimer()
        })

        /**
         * SysAP socket send ping in intervals, pong will be replied automagic by "ws" 
         */
        this.client.on('ping', ping => {
            this.resetHeartBeatTimer()
            this.logger.debug('WS Ping:', ping)
            //this.client.pong() // pong is done by 'ws'
        })

        // Debug
        this.client.on('status', status => {
            this.logger.debug('Received new status:', status)
        })
        this.client.on('input', input => {
            this.logger.debug('Received new input data:', input)
        })
        this.client.on('output', output => {
            this.logger.debug('Received new output data:', output)
        })

    }

    /**
     * 
     * @param stanza Handler called on "message"
     */
    private handleEvent(stanza: any) {
        this.logger.debug("handleEvent:");
        //this.logger.debug(JSON.stringify(stanza));
        for (const [key, value] of Object.entries(stanza.datapoints)) {
            if (key) {
                let telegram = key + '/' + value
                this.logger.debug('*** ' + telegram)
                this.applyIncrementalUpdate(telegram.split('/'));
            }
        }

    }

    private getProtocolHTTP() {
        let tls = this.subscriber.getConfig()['useTLS'];
        if (tls === true || tls === 'true') {
            return 'https://'
        }
        else {
            return 'http://'
        }
    }

    private getProtocolWS() {
        let tls = this.subscriber.getConfig()['useTLS'];
        if (tls === true || tls === 'true') {
            return 'wss://'
        }
        else {
            return 'ws://'
        }
    }

    /**
     * Sending messages are don by HTTPS REST requests (axios instead ws!)5
     *  
     * @param message The channel to be set
     * @param value A value, mostly int or float as string
     */
    private async sendMessage(message: any, value: string) {
        // await this.client!.send(message)
        let bwaToken = this.client!.getBWAToken()
        try {
            let response = await this.axios.put(this.getProtocolHTTP() + this.configuration.hostname + this._path2api + '/rest/datapoint/' + this._uuid + '/' + message,
                value,
                {
                    headers: { 'Authorization': 'Basic ' + bwaToken }
                })

            if (response.status != 200) {
                this.logger.error("Unexpected status code from System Access Point while PUT ")
                throw new Error("Unexpected status code from System Access Point while PUT ")
            }
        }
        catch (e) {
            this.logger.error("Unexpected status code from System Access Point while PUT ");

        }
    }

    /**
     * create and connect WS client
     */
    async connect() {

        await this.createClient()

        if (compareVersions(this.settings!.flags.version, this._minversionAP) < 0) {
            throw Error('Your System Access Point\'s firmware must be at least ' + this._minversionAP);
        }

        try {
            await this.client!.start()
            //this.sendKeepAliveMessages()
            this.startHeartBeat()
        } catch (e: any) {
            this.logger.error('Could not connect to System Access Point', e.toString())
            throw Error("Could not connect to System Access Point")
        }
    }

    async disconnect() {
        this.logger.log("Disconnecting from the System Access Point...");
        await this.client!.stop()
    }

    private disableKeepAliveMessages() {
        if (this.keepAliveTimer !== null) {
            clearInterval(this.keepAliveTimer)
            this.keepAliveTimer = null
        }
    }

    private applyIncrementalUpdate(update: any) {
        if (update == null || !(update instanceof Object)) {
            throw new Error("Invalid Incremental Update")
        }
        let upd = Array()

        if (update.length == 4) {
            const serialNo = update[0]
            const channelNo = update[1]
            const datapointNo = update[2]
            const value = update[3]
            upd[serialNo] = Array();

            if (!(serialNo in this.deviceData)) {
                this.deviceData[serialNo] = {
                    serialNumber: serialNo,
                    channels: {}
                }
            } else {
                upd[serialNo]['deviceId'] = this.deviceData[serialNo]['deviceId']
                upd[serialNo]['typeName'] = this.deviceData[serialNo]['typeName']
            }

            if (channelNo != null) {

                if (!(channelNo in this.deviceData[serialNo]['channels'])) {
                    this.deviceData[serialNo]['channels'][channelNo] = {
                        datapoints: {}
                    }
                }

                if (datapointNo != null) {
                    if (this.deviceData[serialNo]['channels'][channelNo]['datapoints'] != null) {
                        // remote API can be removed here
                        this.deviceData[serialNo]['channels'][channelNo]['datapoints'][datapointNo] = value
                    } else {
                        let channelKey = ''
                        if (this.deviceData[serialNo]['channels'][channelNo]['outputs'][datapointNo] != null) {
                            channelKey = 'outputs'
                        } else
                            if (this.deviceData[serialNo]['channels'][channelNo]['inputs'][datapointNo] != null) {
                                channelKey = 'inputs'
                            }
                        // local API inputs & outputs - datapointNo csn oeitherr be in inputs or outputs
                        upd[serialNo]['channels'] = []
                        upd[serialNo]['channels'][channelNo] = []
                        upd[serialNo]['channels'][channelNo][channelKey] = []
                        upd[serialNo]['channels'][channelNo][channelKey][datapointNo] = this.deviceData[serialNo]['channels'][channelNo][channelKey][datapointNo]
                        upd[serialNo]['channels'][channelNo][channelKey][datapointNo].value = value

                    }

                    // we need this in BuschJaegerApPlatform.prototype.processUpdate = function(actuators)
                    upd[serialNo]['serial'] = serialNo
                    this.logger.debug("Updated Datapoint: " + serialNo + '/' + channelNo + '/' + datapointNo + '/' + value)
                }
                this.subscriber.broadcastMessage({ result: upd, type: 'update' })

            }

        }


    }

    async setDatapoint(serialNo: string, channel: string, datapoint: string, value: string) {
        await this.sendMessage(this.messageBuilder!.buildSetDatapointMessage(serialNo, channel, datapoint, value), value)

        this.logger.log("Set Datapoint: " + serialNo + '/' + channel + '/' + datapoint + '/' + value)
    }

    getDeviceData(): any {
        if (Object.entries(this.deviceData).length === 0 && this.deviceData.constructor === Object) {
            throw new Error("Device Data was requested before we have initialized it")
        }

        return this.deviceData
    }

    /**
     * heartbeat to detect if WS still send messages od my be death
     */
    private async startHeartBeat() {
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
        }
        let self = this;
        this.logger.debug("*** heartBeat " + this.heartBeatRateMillis);
        this.pingTimeout = setInterval(() => {
            self.heartBeat()
        }, this.heartBeatRateMillis);
    }

    /**
     * heartbeat every pingTimeoutSeconds/1000 seconds called, reconnects WS if inactive
     */
    private async heartBeat() {
        this.logger.debug("heartBeat  " + this.heartBeatTimerMillis + "ms ... ")
        if (this.heartBeatTimerMillis > this.heartBeatReconnectLimit) {
            this.logger.error("*** heartBeat Restarting Socket *** (" + this.heartBeatReconnectLimit + ")")
            this.client!.restartSocket()
            this.resetHeartBeatTimer()
            this.registerHandlers()
        }
        this.heartBeatTimerMillis += this.heartBeatRateMillis
    }


    /**
     * ReSets Heartbeat Timer after message received from server
     */
    private resetHeartBeatTimer() {
        this.logger.debug("resetHeartBeatTimer")
        this.heartBeatTimerMillis = 0
    }


}
