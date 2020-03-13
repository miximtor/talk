import * as WebSocket from 'ws';
import {WebSocketSession} from "./websocket-session";
import {Logger} from "../util/log";
import {v4 as UUIDv4} from 'uuid';

export class WebSocketService {
    private logger: Logger;
    private server: WebSocket.Server;

    constructor(private readonly port: number = 3001, private readonly service_id: string = UUIDv4()) {
        this.logger = new Logger(this.constructor.name);
        this.logger.log.info(`${this.service_id} created`);
    }

    public run() {
        this.logger.log.info(`${this.service_id} listening on ${this.port}`);
        this.server = new WebSocket.Server({port: this.port});
        this.server.on("connection", (socket, request) => {
            this.logger.log.info(`${this.service_id} new connection established ${request.connection.remoteAddress}:${request.connection.remotePort}`);
            const session = new WebSocketSession(socket, request);
            session.run();
        });
    }
}

