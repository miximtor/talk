import {Logger} from "../util/log";

import * as express from 'express';

import {v4 as UUIDv4} from 'uuid';

import {queue} from "../util/message-queue";

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

        let result = await conn.query("select account_id, account_type from talk.account where login_id = $1 limit 1", [message.to]);
        const account_type = result.rows[0].account_type;
        const account_id = result.rows[0].account_id;

        result = await conn.query("select relation_id from talk.relation where master_account_id = $1 and slave_account_id = $2 and relation_identity = 'friend'", [account_id, res.locals.account_id]);

        if (account_type === 'personal' && result.rows.length > 0) {
            await queue.public(account_id, message);
        }

        res.send({ok: true});
    }

}

export const message_router = new MessageRouter().router;
