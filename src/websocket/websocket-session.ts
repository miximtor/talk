import * as WebSocket from 'ws';
import {RedisClient} from '../storage/redis';
import {MySQLClient} from "../storage/mysql";

import {RowDataPacket} from 'mysql2';

import {Manager} from "./websocket-session-manager";
import {Logger} from "../util/log";
import {promisify} from "util";
import {v4 as UUIDv4} from 'uuid';

import * as Proto from "./proto";
import {response} from "express";


export class WebSocketSession {
    private logger: Logger;
    private readonly session_id: string;
    private token: string;
    private login_id: string;


    constructor(private ws: WebSocket) {
        this.logger = new Logger(this.constructor.name);
        this.session_id = UUIDv4();
        this.logger.log.info(`${this.session_id} created`);
    }

    public run() {
        const ws_send = promisify(this.ws.send).bind(this.ws);
        this.ws.once("message", (data: string) => {
            this.authentication(JSON.parse(data))
                .then(response => {
                    if (!response.ok) {
                        ws_send(JSON.stringify(response))
                            .then(_ => {
                                this.ws.close(response.code, response.reason);
                            })
                    } else {
                        Manager.register(this);
                        this.start_message_dispatch();
                        ws_send(JSON.stringify(response));
                    }
                });
        });
    }

    public get_token(): string {
        return this.token;
    }

    public get_login_id(): string {
        return this.login_id;
    }

    public notify_destroy() {

    }

    private start_message_dispatch() {
        this.ws.on("close", (code, reason) => {
            this.logger.log.info(`${this.session_id} closed with code:"${code}" reason:"${reason}"`);
            Manager.remove_by_session(this);
        });
    }

    private authentication(request: Proto.IAuthRequest): Promise<Proto.IAuthResponse> {
        const redis_get = promisify(RedisClient.get).bind(RedisClient);
        return redis_get(request.token)
            .then(login_id => {
                if (request.login_id !== login_id) {
                    this.logger.log.error(`${this.session_id} authentication failed`);
                    return {ok: false, reason: "Token错误", code: 4000};
                } else {
                    this.logger.log.debug(`${this.session_id} get login_id "${login_id}"`);
                    this.token = request.token;
                    this.login_id = request.login_id;
                    return {ok: true, reason: '', code: 0};
                }
            });
    }
}