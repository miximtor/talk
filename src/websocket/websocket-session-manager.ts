import {WebSocketSession} from "./websocket-session";
import {Logger} from "../util/log";
import {RedisClient} from "../util/redis";
import * as Redis from "redis";
import {v4 as UUIDv4} from 'uuid';

class WebSocketSessionManager {
    private static logger = new Logger('WebSocketSessionManager');
    private readonly manager_id: string;
    private session_by_token = new Map<string, WebSocketSession>();
    private session_by_account_id = new Map<number, WebSocketSession>();
    private subscriber: Redis.RedisClient;

    constructor() {
        this.manager_id = UUIDv4();
        WebSocketSessionManager.logger.log.info(`${this.manager_id} created`);
        this.subscriber = RedisClient.duplicate();
        this.subscriber.on("message", this.handle_subscribe);
        this.subscriber.subscribe("message");
    }

    private handle_subscribe(channel: string, message: string) {
        WebSocketSessionManager.logger.log.info(`${this.manager_id} from ${channel} received ${message} `);
    }


    public register(session: WebSocketSession) {
        WebSocketSessionManager.logger.log.info(`${this.manager_id} register ${session.get_token()}-${session.get_account_id()}`);
        this.session_by_token.set(session.get_token(), session);
        this.session_by_account_id.set(session.get_account_id(), session);
    };

    public remove_by_token(token: string) {
        const session = this.session_by_token.get(token);
        if (session !== null) {
            this.remove_by_session(session);
        }
    }

    public remove_by_session(session: WebSocketSession) {
        WebSocketSessionManager.logger.log.info(`${this.manager_id} remove ${session.get_token()}-${session.get_account_id()}`);
        this.session_by_token.delete(session.get_token());
        this.session_by_account_id.delete(session.get_account_id());
    }

}

export const Manager = new WebSocketSessionManager();
