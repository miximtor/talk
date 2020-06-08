import {Logger} from "../util/log";

import * as express from 'express';

import {v4 as UUIDv4} from 'uuid';
import {queue} from "../util/message-queue";

class RelationRouter {
    public router;
    private readonly router_id: string;
    private static logger = new Logger('RelationRouter');

    constructor() {
        this.router = express.Router();
        this.router.post('/getcontacts', (req, res) => this.get_contacts(req, res));
        this.router.post('/search', (req, res) => this.search(req, res));
        this.router.post('/addfriend', (req, res) => this.add_friend(req, res));
        this.router.post('/deletefriend', (req, res) => this.delete_friend(req, res));
        this.router.post('/addfriendreply', (req, res) => this.add_friend_reply(req, res));
        this.router.post('/blacklistfriend', (req, res) => this.blacklist_friend(req, res));
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
        let result = await conn.query("select account_id from talk.account where login_id = $1 limit 1", [req.body.slave_login_id]);
        const message = {
            message_id: UUIDv4(),
            from: 'sys',
            sender: 'sys',
            to: req.body.slave_login_id,
            type: 'message-add-friend',
            timestamp: Date.now(),
            content: {
                who: req.body.master_login_id,
                description: req.body.description,
                state: 'wait'
            },
            version: 1
        };
        await queue.public(result.rows[0].account_id, message);
        res.send({ok: true});
    }

    async add_friend_reply(req: express.Request, res :express.Response) {
        const conn = res.locals.db_conn;
        const state = req.body.state;
        const message = req.body.message;

        message.version++;
        message.content.state = state;

        const result = await conn.query("select account_id from talk.account where login_id = $1 limit 1", [message.content.who]);
        const sender_account_id = result.rows[0].account_id;

        if (state === 'ok') {
            await conn.query("insert into talk.relation(relation_type, master_account_id, slave_account_id, relation_identity) values('one-one', $1, $2, 'friend'), ('one-one', $2, $1, 'friend')", [res.locals.account_id, sender_account_id]);
            const welcome = {
                message_id: UUIDv4(),
                from: message.to,
                sender: message.to,
                to: message.content.who,
                type: 'message-welcome',
                timestamp: Date.now(),
                content: {
                    text: '已经是好友了，开始聊天吧！'
                },
                version: 1
            };
            await queue.public(sender_account_id, welcome);
            welcome.from = message.content.who;
            welcome.sender = message.content.who;
            welcome.to = message.to;
            await queue.public(res.locals.account_id, welcome);
        } else if (state === 'refuse') {
            const reject = {
                message_id: UUIDv4(),
                from: 'sys',
                sender: 'sys',
                to: message.content.who,
                type: 'message-add-friend-refuse',
                timestamp: Date.now(),
                content: {
                    who: message.to
                },
                version: 1
            };
            await queue.public(sender_account_id, reject);
        } else if (state === 'blacklist') {
            await conn.query("insert into talk.relation (relation_type, master_account_id, slave_account_id, relation_identity) values('one-one', $1, $2, 'blacklist')", [res.locals.account_id, sender_account_id]);
        }
        res.send({ok: true});
        await queue.public(res.locals.account_id, message);

    }

    async delete_friend(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const result = await conn.query("select account_id from talk.account where login_id = $1 limit 1", [req.body.slave_login_id]);
        await conn.query("delete from talk.relation where master_account_id = $1 and slave_account_id = $2", [res.locals.account_id, result.rows[0].account_id]);
        res.send({ok: true});
    }

    async blacklist_friend(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const result = await conn.query("select account_id from talk.account where login_id = $1 limit 1", [req.body.slave_login_id]);
        await conn.query("update talk.relation set relation_identity = 'blacklist' where master_account_id = $1 and slave_account_id = $2", [res.locals.account_id, result.rows[0].account_id])
        res.send({ok: true});
    }
}

export const relation_router = new RelationRouter().router;
