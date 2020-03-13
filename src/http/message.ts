import {Logger} from "../util/log";

import * as express from 'express';

import {RedisClient} from "../util/redis";
import {PostgresPool} from "../util/postgres";

import {v4 as UUIDv4} from 'uuid';

import {promisify} from "util";

class MessageRouter {
    public router;
    private readonly router_id: string;
    private logger: Logger;

    constructor() {
        this.logger = new Logger(this.constructor.name);
        this.router = express.Router();
        this.router.use('/getoffline', this.get_offline);
        this.router_id = UUIDv4();
    }

    async get_offline(req: express.Request, res: express.Response) {
        try {
            const multi = RedisClient.multi();
            const key = 'msg' + res.locals.login_id;
            multi.lrange(key, 0, -1).del(key);
            const response = await promisify(multi.exec).bind(multi)();
            res.send({ok: true, reason: '', data: response[0]});
        } catch (e) {
            this.logger.log.error(`${this.router_id} error ${e}`);
            res.send({ok: false, reason: '数据库错误'});
        }
    }

    async send(req: express.Request, res: express.Response) {
        try {
            if (req.body.message.from !== res.locals.login_id) {
                res.send({ok: false, reason: '非法的发送者'});
                return;
            }
            await promisify(RedisClient.publish).bind(RedisClient)('message', JSON.stringify(req.body.message));
            res.send({ok: true, reason: ''});
        } catch (e) {
            this.logger.log.error(`${this.router_id} error ${e}`);
            res.send({ok: false, reason: '数据库错误'});
        }
    }

}

export const message_router = new MessageRouter().router;