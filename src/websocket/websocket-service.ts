import * as WebSocket from 'ws';
import {WebSocketSession} from "./websocket-session";
import {Logger} from "../util/log";
import {v4 as UUIDv4} from 'uuid';
import {Token} from "../util/token";
import * as http from 'http';
import * as net from "net";


export class WebSocketService {
    private logger: Logger;
    private http_server: http.Server;

    private websocket_server: WebSocket.Server;

    constructor(private readonly port: number = 3001, private readonly service_id: string = UUIDv4()) {
        this.logger = new Logger(this.constructor.name);
        this.http_server = http.createServer();
        this.websocket_server = new WebSocket.Server({noServer: true});
        this.logger.log.info(`${this.service_id} created`);
    }

    public run() {

        this.http_server.on("upgrade", async (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
            const [success, account_id, token] = await this.authentication(req);
            if (!success) {
                socket.destroy();
            }
            this.websocket_server.handleUpgrade(req, socket, head, (ws) => {
                this.websocket_server.emit('connection', ws, req, token, account_id);
            })
        });

        this.websocket_server.on("connection", async (socket, request, token, account_id) => {
            const session = new WebSocketSession(socket, token, account_id);
            await session.run();
        });

        this.logger.log.info(`${this.service_id} listening on ${this.port}`);
        this.http_server.listen(3001);
    }

    private async authentication(request): Promise<[boolean, number, string]> {
        try {
            const url = new URL(request.url, `http://${request.headers.host}`);
            const token = url.searchParams.get('token');
            const account_id = await new Token(token).extend();
            if (account_id === 0) {
                return [false, 0, ''];
            }
            return [true, account_id, token];
        } catch (e) {
            this.logger.log.error(`Redis error ${e}`);
            return [false, 0, ''];
        }
    }
}

