import {Logger} from "../util/log";

import * as express from 'express';

import {MySQLClient} from "../storage/mysql";
import {RedisClient} from "../storage/redis";

import {RowDataPacket} from 'mysql2';
import {v4 as UUIDv4} from 'uuid';
import {promisify} from "util";
import {json} from "express";

class AccountRouter {
    public router;
    private readonly router_id: string;
    private logger: Logger;

    constructor() {
        this.logger = new Logger(this.constructor.name);

        this.router = express.Router();
        this.router.post('/register', this.register);
        this.router.post('/checkloginid', this.check_login_id)
        this.router.post('/login', this.login);
        this.router.post('/getpersonalinfo', this.get_personal_info);
        this.router.post('/getcontacts', this.get_contacts);
        this.router.post('/updatepersonalinfo', this.update_personal_info);
        this.router_id = UUIDv4();
    }

    register(req: express.Request, res: express.Response) {
        const hash = require('password-hash');
        MySQLClient.execute('INSERT INTO account SET login_id=?,login_password=?,email=?,phone=?,avatar=?', [
            req.body.login_id,
            hash.generate(req.body.login_password),
            req.body.email,
            req.body.phone,
            req.body.avatar
        ])
            .then(_ => {
                res.send({ok: true, reason: ''});
            })
            .catch(e => {
                this.logger.log(`${this.router_id} MySQL error: ${e}`)
                res.send({ok: false, reason: '数据库错误'});
            });
    }

    check_login_id(req: express.Request, res: express.Response) {
        MySQLClient.query<RowDataPacket[]>('SELECT login_id FROM account WHERE login_id = ? LIMIT 1', [req.body.login_id])
            .then(([result, field]) => {
                if (result.length !== 0) {
                    res.send({
                        ok: false,
                        reason: '用户名已注册'
                    });
                } else {
                    res.send({
                        ok: true,
                        reason: ''
                    });
                }
            })
            .catch(e => {
                this.logger.log(`${this.router_id} MySQL error: ${e}`)
                res.send({ok: false, reason: '数据库错误'});
            });
    }

    login(req: express.Request, res: express.Response) {
        const hash = require('password-hash');
        MySQLClient.query<RowDataPacket[]>("SELECT * FROM account WHERE login_id = ? LIMIT 1", [req.body.login_id])
            .then(([result, field]) => {
                if (result.length === 0 || !hash.verify(req.body.login_password, result[0]['login_password'])) {
                    res.send({
                        ok: false,
                        reason: '用户名或密码错误'
                    });
                } else {
                    const token = UUIDv4();
                    const transCommand = RedisClient.multi();
                    transCommand.setex(token, 240, req.body.login_id).setex(req.body.login_id, 240, token);
                    const trans = promisify(transCommand.exec).bind(transCommand);
                    trans()
                        .then(() => {
                            res.send({
                                ok: true,
                                token: token
                            })
                        });
                }
            })
            .catch(e => {
                this.logger.log(`${this.router_id} MySQL error: ${e}`)
                res.send({ok: false, reason: '数据库错误'});
            });
    }

    get_personal_info(req: express.Request, res: express.Response) {
        MySQLClient.query<RowDataPacket[]>("SELECT * FROM account WHERE login_id=?", [res.locals.login_id])
            .then(([result, field]) => {
                let response = result[0];
                delete response.auto_id;
                delete response.login_password;
                res.send({
                    ok: true,
                    reason: '',
                    data: response
                });
            })
            .catch(e => {
                this.logger.log(`${this.router_id} MySQL error: ${e}`)
                res.send({ok: false, reason: '数据库错误'});
            });
    }

    get_contacts(req: express.Request, res: express.Response) {
        MySQLClient.query<RowDataPacket[]>(
            "SELECT account.* FROM account,account_relation WHERE account.login_id=account_relation.slave_login_id AND account_relation.master_login_id=?",
            [res.locals.login_id])
            .then(([result, field]) => {
                result.forEach(contact => {
                    delete contact.login_password;
                    delete contact.auto_id;
                    delete contact.create_time;
                    delete contact.last_modify_time;
                });
                res.send({
                    ok: true,
                    reason: '',
                    data: result
                });
            })
            .catch(e => {
                this.logger.log(`${this.router_id} MySQL error: ${e}`)
                res.send({ok: false, reason: '数据库错误'});
            });
    }

    update_personal_info(req: express.Request, res: express.Response) {
        MySQLClient.query<RowDataPacket[]>("UPDATE account SET avatar=?,email=? WHERE login_id=?", [req.body.avatar, req.body.email, res.locals.login_id])
            .then(() => MySQLClient.query<RowDataPacket[]>("SELECT * FROM account WHERE login_id=? LIMIT 1", [res.locals.login_id]))
            .then(([result, field]) => {
                let response = result[0];
                delete response.auto_id;
                delete response.login_password;
                res.send({
                    ok: true,
                    reason: '',
                    data: response
                });
            })
            .catch(e => {
                this.logger.log(`${this.router_id} MySQL error: ${e}`)
                res.send({ok: false, reason: '数据库错误'});
            });
    }
}

export const account_router = new AccountRouter().router;
