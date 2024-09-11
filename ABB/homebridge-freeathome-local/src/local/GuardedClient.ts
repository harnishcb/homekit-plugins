import WebSocket from "ws";
import { Logger, ConsoleLogger } from "freeathome-api/dist/lib/Logger"
import { Subscriber } from "freeathome-api/dist/lib/Subscriber"


export class GuardedClient {
    private logger: Logger = new ConsoleLogger();
    private errorSubscriber: Subscriber;
    private client: WebSocket;
    private _bwaToken: string = "";
    private _wsURL: string = "";

  

    constructor(errorSubscriber: Subscriber, options?: any, logger?: Logger) {
       
        this._bwaToken = Buffer.from(options['username'] + ':' + options['password']).toString('base64')
        this._wsURL = options['service']
        this.client = this.createWebsocket()

        this.errorSubscriber = errorSubscriber
        if (logger !== undefined && logger !== null) {
            this.logger = logger
        }
    }

    /**
     * creates the websocket object
     * @returns Websocket
     */
    protected createWebsocket(): WebSocket {
        return new WebSocket(this._wsURL, {
            protocolVersion: 13,
            rejectUnauthorized: false,
            headers: {
                "Authorization": "Basic " + this.getBWAToken()
            }
        })
    }

    /**
     * terminates socket connection immediately and creates a new one
     */
    public restartSocket() {
         // Use `WebSocket#terminate()`, which immediately destroys the connection,
        // instead of `WebSocket#close()`, which waits for the close timer.
        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        this.terminate()
        this.client = this.createWebsocket()
    }

    /**
     * 
     * @returns The BWA auth token for ws: and http(s):// authentification
     */
    public getBWAToken(): String {
        return this._bwaToken
    }

    on(event: string, fn: (a: any) => any): void {
        this.logger.debug("GuardedClient ON: " + event)
        this.client.on(event, fn)
    }

   

    /**
     * Extend on-event method to guard execution and expose errors through broadcast messages.
     * @param event
     * @param fn
     */
    guardedOn(event: string, fn: (a: any) => any): void {
        const guardedFn = async (a: any) => {
            try {
                
                this.logger.debug("this.client.readyState:" + this.client.readyState)
                
                await fn(a)
            } catch (err: any) {
                this.logger.error(`Unexpected error while processing ${event} event`, err)
                this.broadCastError(err);
            }
        }

        this.client.on(event, guardedFn)
    }

    
    send(stanza: any): Promise<any> {
        //return new Promise (executor: this.client.send(stanza))
        this.logger.debug("*** WS send() ***")
        return new Promise<void>((resolve, reject) => {
            this.client.send(stanza)
            resolve()
        })
    }

    ping(): Promise<any> {
    
        return new Promise<void>((resolve, reject) => {
            this.logger.debug("*** PING ***")
            resolve()
        })
    }

    pong(): Promise<any> {
    
        return new Promise<void>((resolve, reject) => {
            this.logger.debug("*** WS PONG ***")
            resolve()
        })
    }

    start(): Promise<any> {
        this.logger.debug("*** WS start ***")
        return new Promise<void>((resolve, reject) => {
            if (this.client.readyState === WebSocket.OPEN) {
                resolve()
            } else {
                resolve()
            }
        })
    }

    stop(): Promise<any> {

        return new Promise<void>((resolve, reject) => {
            if (this.client.readyState === WebSocket.OPEN) {
                this.client.terminate()
                resolve()
            } else {
                resolve()
            }
        })
    }

    terminate(): Promise<any> {
        return new Promise<void>((resolve, reject) => {
                this.client.terminate()
                resolve()
        })
    }

    private broadCastError(err: Error) {
        this.errorSubscriber.broadcastMessage({
            type: "error",
            result: {
                message: err.message,
                error: err
            }
        }
        )
    }
}