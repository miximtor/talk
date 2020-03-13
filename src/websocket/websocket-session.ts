import * as WebSocket from 'ws';
import {RedisClient} from '../util/redis';

import {Manager} from "./websocket-session-manager";
import {Logger} from "../util/log";
import {promisify} from "util";
import {v4 as UUIDv4} from 'uuid';
import {IncomingMessage} from "http";

import * as Proto from "./proto";


export class WebSocketSession {
    private logger: Logger;
    private readonly session_id: string;
    private account_id: number;
    private readonly token: string;


    constructor(private socket: WebSocket, private request: IncomingMessage) {
        this.logger = new Logger(this.constructor.name);
        this.session_id = UUIDv4();
        const url = new URL(request.url, `http://${request.headers.host}`);
        this.token = url.searchParams.get('token');
        this.logger.log.info(`${this.session_id} created`);
    }

    public run() {
        (async () => {
            const success = await this.authentication();
            if (!success) {
                this.socket.close(4000, '连接认证失败');
                return;
            }

            Manager.register(this);
            this.socket.on("close", (code, reason) => {
                this.on_client_close(code, reason);
            });

            this.socket.send(JSON.stringify({ok: true}));
        })();
    }

    private on_client_close(code: number, reason: string) {
        this.logger.log.info(`${this.session_id} closed ${code}-"${reason}"`);
        Manager.remove_by_session(this);
    }


    private async authentication() {
        try {
            const multi = RedisClient.multi();
            multi.expire(this.token, 240).get(this.token);
            const result = await promisify(multi.exec).bind(multi)();
            if (result[0] === 0) {
                return false;
            }
            this.account_id = Number.parseInt(result[1]);
            await promisify(RedisClient.setex).bind(RedisClient)(this.account_id.toString(), 240, this.token);
            return true;
        } catch (e) {
            this.logger.log.error(`${this.session_id} authentication error ${e}`);
            return false;
        }
    }

    public get_token(): string {
        return this.token;
    }

    public get_account_id(): number {
        return this.account_id;
    }

}