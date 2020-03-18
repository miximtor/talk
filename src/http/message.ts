import {Logger} from "../util/log";

import * as express from 'express';

import {RedisClient} from "../util/redis";

import {v4 as UUIDv4} from 'uuid';

import {promisify} from "util";

class MessageRouter {
    public router;
    private readonly router_id: string;
    private static logger = new Logger('MessageRouter');

    constructor() {
        this.router = express.Router();
        this.router.post('/send', (req, res) => this.send(req, res));
        this.router_id = UUIDv4();
    }

    async send(req: express.Request, res: express.Response) {
        let conn = res.locals.db_conn;
        const message = req.body.message;
        let result = await conn.query("select account_type from talk.account where login_id = $1", [message.to]);
        if (result.rows[0].account_type === 'personal') {
            await promisify(RedisClient.publish).bind(RedisClient)('message', JSON.stringify(message));
            res.send({ok: true});
        } else {
        }
    }

}

export const message_router = new MessageRouter().router;
