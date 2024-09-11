import WebSocket from "ws";
import { Logger } from "freeathome-api/dist/lib/Logger";
import { Subscriber } from "freeathome-api/dist/lib/Subscriber";
export declare class GuardedClient {
    private logger;
    private errorSubscriber;
    private client;
    private _bwaToken;
    private _wsURL;
    constructor(errorSubscriber: Subscriber, options?: any, logger?: Logger);
    protected createWebsocket(): WebSocket;
    restartSocket(): void;
    getBWAToken(): String;
    on(event: string, fn: (a: any) => any): void;
    guardedOn(event: string, fn: (a: any) => any): void;
    send(stanza: any): Promise<any>;
    ping(): Promise<any>;
    pong(): Promise<any>;
    start(): Promise<any>;
    stop(): Promise<any>;
    terminate(): Promise<any>;
    private broadCastError;
}
