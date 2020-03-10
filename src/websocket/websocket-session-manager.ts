import {WebSocketSession} from "./websocket-session";
import {Logger} from "../util/log";
import {v4 as UUIDv4} from 'uuid';

class WebSocketSessionManager {
    private logger: Logger;
    private readonly manager_id: string;
    private session_by_token = new Map<string, WebSocketSession>();
    private session_by_login_id = new Map<string, WebSocketSession>();

    constructor() {
        this.logger = new Logger(this.constructor.name);
        this.manager_id = UUIDv4();
        this.logger.log.info(`${this.manager_id} created`);
    }

    public push(target: Array<string>, message: string) {
    }

    public register(session: WebSocketSession) {
        this.logger.log.info(`${this.manager_id} register ${session.get_token()}-${session.get_login_id()}`);
        this.session_by_token.set(session.get_token(), session);
        this.session_by_login_id.set(session.get_login_id(), session);
    };

    public remove_by_token(token: string) {
        const session = this.session_by_token.get(token);
        if (session !== null) {
            this.remove_by_session(session);
        }
    }

    public remove_by_session(session: WebSocketSession) {
        this.logger.log.info(`${this.manager_id} remove ${session.get_token()}-${session.get_login_id()}`);
        this.session_by_token.delete(session.get_token());
        this.session_by_login_id.delete(session.get_login_id());
    }

}

export const Manager = new WebSocketSessionManager();