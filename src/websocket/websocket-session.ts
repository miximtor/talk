import * as WebSocket from 'ws';

import {Logger} from "../util/log";
import {v4 as UUIDv4} from 'uuid';
import {Token} from "../util/token";
import Timeout = NodeJS.Timeout;
import {promisify} from "util";
import {RedisClient} from "../util/redis";
import {queue} from "../util/message-queue";
import * as AMQP from "amqplib";

export class WebSocketSession {
    private logger: Logger;
    private readonly session_id: string;
    private static readonly retry_policy = [8000, 8000, 16000, 32000, 32000, 32000, 32000];
    private token: Token;
    private message_channel: AMQP.Channel;
    private timeout: Timeout;

    constructor(private socket: WebSocket, token: string, private readonly account_id: number) {
        this.logger = new Logger(this.constructor.name);
        this.token = new Token(token);
        this.session_id = UUIDv4();
        this.logger.log.info(`${this.session_id} created`);
    }

    public async run() {
        this.message_channel = await queue.create_receive_channel();
        await this.message_channel.consume(`message-queue-${this.account_id}`, msg => {
            const message = JSON.parse(msg.content.toString('utf8'));
            this.socket.send(JSON.stringify(message));

            const retry_message = async (policy_step: number) => {
                if (this.socket.readyState !== WebSocket.OPEN) {
                    return;
                }

                const result = await promisify(RedisClient.get).bind(RedisClient)(`message:${message.message_id}-${message.version}`);
                if (result === 'accepted') {
                    await promisify(RedisClient.del).bind(RedisClient)(`message:${message.message_id}-${message.version}`);
                    await this.message_channel.ack(msg);
                    return;
                }

                if (policy_step >= WebSocketSession.retry_policy.length) {
                    this.socket.close(4004, 'message timeout');
                    return;
                }

                this.socket.send(JSON.stringify(message));
                setTimeout(retry_message, WebSocketSession.retry_policy[policy_step + 1], policy_step + 1);

            };
            setTimeout(retry_message, WebSocketSession.retry_policy[0], 0);
        });

        this.timeout = setTimeout(async () => {
            this.socket.close(4002, 'server timeout');
        }, 120000);


        this.socket.on("close", async (code, reason) => {
            await this.on_close(code, reason);
        });

        this.socket.on("error", async (err) => {
            this.logger.log.error(`${this.session_id} socket error ${err.message}`);
            this.socket.close(4003, 'error ' + err.message);
        });

        this.socket.on("message", async (data: string) => {
            clearTimeout(this.timeout);
            const message = JSON.parse(data);
            this.timeout = setTimeout(async () => {
                this.socket.close(4002, 'server timeout');
            }, 120000);

            if (message.token != this.token.get()) {
                this.socket.close(4000, 'authentication fail');
                return;
            }
            await this.token.extend();

            await this.on_message(JSON.parse(data));
        });


    }

    private async on_close(code: number, reason: string) {
        this.logger.log.info(`${this.session_id} closed ${code}-"${reason}"`);
        await this.token.invalidate();
        await this.message_channel.nackAll(true);
        await this.message_channel.close();
        clearTimeout(this.timeout);
    }

    private async on_message(message) {
        if (message.type === 'keepalive') {
            return;
        } else if (message.type === 'message-accept') {
            await promisify(RedisClient.set).bind(RedisClient)(`message:${message.message_id}-${message.version}`, 'accepted');
        }
    }

    public get_token(): string {
        return this.token.get();
    }

    public get_account_id(): number {
        return this.account_id;
    }


}

