import {WebSocketSession} from "./websocket-session";
import {Logger} from "../util/log";
import {RedisClient} from "../util/redis";
import * as Redis from "redis";
import {v4 as UUIDv4} from 'uuid';
import {promisify} from "util";

class WebSocketSessionManager {
    private static logger = new Logger('WebSocketSessionManager');
    private readonly manager_id: string;
    private session_by_token: Map<String, WebSocketSession> = new Map();
    private session_by_account_id: Map<Number, WebSocketSession> = new Map();
    private subscriber: Redis.RedisClient;

    constructor() {
        this.manager_id = UUIDv4();
        WebSocketSessionManager.logger.log.info(`${this.manager_id} created`);
        this.subscriber = RedisClient.duplicate();
        this.subscriber.on("message", async (channel, message) => {
            await this.handle_subscribe(channel, JSON.parse(message))
        });
        this.subscriber.subscribe("message");
    }

    private async handle_subscribe(channel: string, message) {
        WebSocketSessionManager.logger.log.info(`${this.manager_id} from ${message.from} to ${message.to}, ${message.to_account_id} ${JSON.stringify(message)}`);
        const to_account = JSON.parse(JSON.stringify(message.to_account_id));
        delete message.to_account_id;
        const session = this.session_by_account_id.get(to_account);
        if (!session) {
            return;
        }

        const retry_policy = [4000, 8000, 16000, 32000, 32000, 32000, 32000];

        const retry_message = async (policy_step: number) => {
            const result = await promisify(RedisClient.get).bind(RedisClient)(`message:${message.message_id}`);
            const session = this.session_by_account_id.get(to_account);
            if (result === 'accepted') {
                await promisify(RedisClient.del).bind(RedisClient)(`message:${message.message_id}`);
                return;
            }

            if (session === undefined || policy_step >= retry_policy.length) {
                session?.notify_close(4004, 'message timeout');
                return;
            }

            session.push(message);
            setTimeout(retry_message, retry_policy[policy_step + 1], policy_step + 1);
        };

        setTimeout(retry_message, retry_policy[0], 0);

        session.push(message);
    }


    public register(session: WebSocketSession) {
        WebSocketSessionManager.logger.log.info(`${this.manager_id} register ${session.get_token()}-${session.get_account_id()}`);
        this.session_by_token.set(session.get_token(), session);
        this.session_by_account_id.set(session.get_account_id(), session);
    };

    public remove_by_session(session: WebSocketSession) {
        WebSocketSessionManager.logger.log.info(`${this.manager_id} remove ${session.get_token()}-${session.get_account_id()}`);
        this.session_by_token.delete(session.get_token());
        this.session_by_account_id.delete(session.get_account_id());
    }

}

export const Manager = new WebSocketSessionManager();
