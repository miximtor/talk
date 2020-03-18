import * as express from 'express';
import {RedisClient} from "./redis";
import {Logger} from "./log";
import {promisify} from "util";
import {v4 as UUIDv4} from 'uuid';


const white_list: Array<string> = [
    '/account/login',
    '/account/checkloginid',
    '/account/register',
    '/account/getsecurityquestion'
];

export class Token {
    private static logger: Logger = new Logger('Token');

    constructor(private readonly token: string = UUIDv4()) {
    }

    public async init(account_id: number) {
        Token.logger.log.info(`token init ${this.token}-${account_id}`);
        await promisify(RedisClient.setex).bind(RedisClient)(`token:${this.token}`, 240, account_id.toString());
        return this.token;
    }

    public async extend(time_second: number = 240) {
        const multi = RedisClient.multi();
        multi.expire(`token:${this.token}`, 240).get(`token:${this.token}`);
        const result: any[] = await promisify(multi.exec).bind(multi)();
        if (result[0] === 0) {
            return 0;
        }
        Token.logger.log.info(`token extend ${this.token}-${result[1]}`);
        return result[1];
    }

    public async invalidate() {
        Token.logger.log.info(`token invalidate ${this.token}`);
        await promisify(RedisClient.del).bind(RedisClient)(`token:${this.token}`);
    }


    public static async http_auth(req: express.Request, res: express.Response, next) {
        Token.logger.log.info(`${res.locals.request_id} ${req.method} ${req.path}`);
        if (white_list.indexOf(req.path) !== -1) {
            Token.logger.log.info(`${res.locals.request_id} ${req.path} in whitelist`);
            next();
            return;
        }

        if (!req.body.token) {
            Token.logger.log.error(`${res.locals.request_id} ${req.path} no token param`);
            res.send({ok: false, reason: '鉴权失败'});
            return;
        }

        const account_id = await new Token(req.body.token).extend();

        if (account_id === 0) {
            Token.logger.log.error(`${res.locals.request_id} ${req.path} token expired`);
            res.send({ok: false, reason: '鉴权失败'});
            return;
        }

        res.locals.account_id = account_id;
        Token.logger.log.info(`${res.locals.request_id} ${req.path} pass`);
        next();
    }
}
