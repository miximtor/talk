import {Logger} from "../util/log";

import * as express from 'express';

import {v4 as UUIDv4} from 'uuid';
import {PostgresPool} from "../util/postgres";
import {promisify} from "util";
import {RedisClient} from "../util/redis";

class RelationRouter {
    public router;
    private readonly router_id: string;
    private static logger = new Logger('RelationRouter');

    constructor() {
        this.router = express.Router();
        this.router.post('/getcontacts', (req, res) => this.get_contacts(req, res));
        this.router.post('/search', (req, res) => this.search(req, res));
        this.router_id = UUIDv4();
    }

    async get_contacts(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const selectQuery = "select * from talk.contacts where master_account_id = $1 and relation_identity in ($2,$3) order by login_id";
        const selectParam = [res.locals.account_id, 'friend', 'admin'];
        const result = await conn.query(selectQuery, selectParam);
        result.rows.forEach(slave => delete slave.master_account_id);
        res.send({ok: true, data: result.rows});
    }

    async search(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const selectQuery =
            "with accounts as (select * from talk.account_nonsens where login_id like $1 or nick like $1 or phone like $1)"+
            "select * from accounts where account_type = 'personal' and login_id not in (select login_id from talk.contacts where master_account_id = $2) and account_id != $2";
        const result = await conn.query(selectQuery, [`%${req.body.key_text}%`, res.locals.account_id]);
        result.rows.forEach(account => delete account.account_id);
        res.send({ok: true, data: result.rows});
    }

    async add_friend(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        let result = await conn.query("select account_id, from talk.account where login_id = $1 limit 1", [req.body.slave_login_id]);
        const message = {
            message_id: UUIDv4(),
            from: 'system',
            sender: 'system',
            to: req.body.slave_login_id,
            type: 'system-add-friend',
            timestamp: Date.now(),
            to_account_id: result.rows[0].account_id,
            content: {
                who: req.body.master_login_id,
                description: req.body.description
            }
        };
        await promisify(RedisClient.publish).bind(RedisClient)('message', JSON.stringify(message));
        res.send({ok: true});
    }
}

export const relation_router = new RelationRouter().router;
