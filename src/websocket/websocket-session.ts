import * as WebSocket from 'ws';
import {RedisClient} from '../util/redis';

import {Manager} from "./websocket-session-manager";
import {Logger} from "../util/log";
import {promisify} from "util";
import {v4 as UUIDv4} from 'uuid';

export class WebSocketSession {
    private logger: Logger;
    private readonly session_id: string;


    constructor(private socket: WebSocket, private readonly token: string, private readonly account_id: number) {
        this.logger = new Logger(this.constructor.name);
        this.session_id = UUIDv4();
        this.logger.log.info(`${this.session_id} created`);
    }

    public run() {
        Manager.register(this);
        this.socket.on("close", (code, reason) => {
            this.on_client_close(code, reason);
        });
    }

    private on_client_close(code: number, reason: string) {
        this.logger.log.info(`${this.session_id} closed ${code}-"${reason}"`);
        Manager.remove_by_session(this);
    }



    public get_token(): string {
        return this.token;
    }

    public get_account_id(): number {
        return this.account_id;
    }

}