import {Logger} from "../util/log";

import * as express from 'express';

import {RedisClient} from "../util/redis";

import {v4 as UUIDv4} from 'uuid';
import {promisify} from "util";

class AccountRouter {
    public router;
    private readonly router_id: string;
    private logger: Logger;

    constructor() {
        this.logger = new Logger(this.constructor.name);

        this.router = express.Router();
        this.router.post('/register', this.register);
        this.router.post('/checkloginid', this.check_login_id);
        this.router.post('/login', this.login);
        this.router.post('/logout', this.logout);
        this.router.post('/getpersonalinfo', this.get_personal_info);
        this.router.post('/updatepersonalinfo', this.update_personal_info);
        this.router_id = UUIDv4();
    }

    async register(req: express.Request, res: express.Response) {
        const hash = require('password-hash');
        const conn = res.locals.db_conn;

        const insertQuery = "insert into talk.account(account_type, login_id, login_password, nick, email, phone, avatar) values($1,$2,$3,$4,$5,$6,$7)";
        const insertParameter = ['personal',req.body.login_id, hash.generate(req.body.login_password), req.body.nick, req.body.email, req.body.phone, req.body.avatar];
        await conn.query(insertQuery, insertParameter);
        res.send({ok: true, reason: ''});
    }

    async check_login_id(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const result = await conn.query("select login_id from talk.account where login_id = $1 limit 1", [req.body.login_id]);
        if (result.rowCount !== 0) {
            res.send({ok: false, reason: '用户名已注册'});
        } else {
            res.send({ok: true, reason: ''});
        }
    }

    async login(req: express.Request, res: express.Response) {
        const hash = require('password-hash');
        const conn = res.locals.db_conn;
        const result = await conn.query("select * from talk.account where login_id = $1 limit 1", [req.body.login_id]);
        if (result.rowCount === 0 || !hash.verify(req.body.login_password, result.rows[0].login_password)) {
            res.send({ok: false, reason: '用户名或密码错误'});
            return;
        }
        const account_id = result.rows[0].account_id;
        const token = UUIDv4();
        const transCommand = RedisClient.multi();
        transCommand.setex(token, 240, account_id).setex(account_id, 240, token);
        await promisify(transCommand.exec).bind(transCommand)();
        res.send({ok: true, token: token});
    }

    async logout(req: express.Request, res: express.Response) {
        const multi = RedisClient.multi();
        multi.del(req.body.token).del(res.locals.account_id);
        await promisify(multi.exec).bind(multi)();
        res.send({ok: true});
    }

    async get_personal_info(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const result = await conn.query("select * from talk.account_nonsens where account_id=$1 limit 1", [res.locals.account_id]);
        const personal_info = result.rows[0];
        delete personal_info.account_id;
        res.send({ok: true, data: personal_info});
    }


    async update_personal_info(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const result = await conn.query("update talk.account set avatar=$1,nick=$2,email=$3,phone=$4 where account_id=$5 returning account_type,login_id,avatar,phone,email,nick",[req.body.avatar, req.body.nick, req.body.email, req.body.phone, res.locals.account_id]);
        const personal_info = result.rows[0];
        res.send({ok:true, data: personal_info});
    }
}

export const account_router = new AccountRouter().router;
