import {Logger} from "../util/log";

import * as express from 'express';

import {v4 as UUIDv4} from 'uuid';
import {promisify} from "util";
import {Token} from "../util/token";
import {queue} from "../util/message-queue";

class AccountRouter {
    public router;
    private readonly router_id: string;
    private static logger = new Logger('AccountRouter');

    constructor() {

        this.router = express.Router();
        this.router.post('/register', (req,res) => this.register(req,res));
        this.router.post('/checkloginid', (req, res) => this.check_login_id(req,res));
        this.router.post('/login', (req,res) => this.login(req, res));
        this.router.post('/getpersonalinfo', (req,res) => this.get_personal_info(req, res));
        this.router.post('/updatepersonalinfo', (req, res) => this.update_personal_info(req, res));
        this.router.post('/getsecurityquestion', (req, res) => this.get_security_question(req, res));
        this.router_id = UUIDv4();
    }

    async register(req: express.Request, res: express.Response) {
        const hash = require('password-hash');
        const conn = res.locals.db_conn;

        const insertQuery =
            "insert into talk.account(" +
            "account_type, " +
            "login_id, " +
            "login_password, " +
            "nick, " +
            "email, " +
            "phone, " +
            "avatar, " +
            "question1, " +
            "question2, " +
            "question3, " +
            "answer1, " +
            "answer2, " +
            "answer3) " +
            "values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning account_id";
        const insertParameter =
            [
                'personal',
                req.body.login_id,
                hash.generate(req.body.login_password),
                req.body.nick,
                req.body.email,
                req.body.phone,
                req.body.avatar,
                req.body.question1, req.body.question2, req.body.question3,
                hash.generate(req.body.answer1),hash.generate(req.body.answer2),hash.generate(req.body.answer3)];
        const result = await conn.query(insertQuery, insertParameter);
        await queue.create_queue(result.rows[0].account_id);
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
        const token = await new Token().init(result.rows[0].account_id);
        res.send({ok: true, token: token});
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
        const updateQuery = "update talk.account set avatar=$1,nick=$2,email=$3,phone=$4 where account_id=$5 returning account_type,login_id,avatar,phone,email,nick";
        const updateParam = [req.body.avatar, req.body.nick, req.body.email, req.body.phone, res.locals.account_id];
        const result = await conn.query(updateQuery, updateParam);
        const personal_info = result.rows[0];
        res.send({ok: true, data: personal_info});
    }

    async get_security_question(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const result = await conn.query("select question1, question2, question3 from talk.account where login_id = $1 limit 1", [req.body.login_id]);
        if (result.rows.length < 1) {
            res.send({ok: false, reason: '账号不存在'});
        } else {
            res.send({ok: true, data: result.rows[0]});
        }
    }

    async validate_security_question(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const hash = require('password-hash');
        const result = await conn.query("select answer1, answer2, answer3 from talk.account where login_id = $1 limit 1",[req.body.login_id]);
        if (result.rows.length < 1) {
            res.send({ok: false, reason: '账号不存在'});
        }

    }

}

export const account_router = new AccountRouter().router;
