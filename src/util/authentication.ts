import * as express from 'express';
import {RedisClient} from "./redis";
import {Logger} from "./log";
import {promisify} from "util";
import {v4 as UUIDv4} from 'uuid';

const logger: Logger = new Logger('AuthMiddleware');
const white_list: Array<string> = ['/account/login', '/account/checkloginid', '/account/register'];

export async function authentication(req: express.Request, res: express.Response, next) {
    const request_id = UUIDv4();
    logger.log.info(`${request_id} ${req.method} ${req.path}`);

    if (white_list.indexOf(req.path) !== -1) {
        logger.log.info(`${request_id} ${req.path} in whitelist`);
        next();
        return;
    }

    if (!req.body.token) {
        logger.log.error(`${request_id} ${req.path} no token param`);
        res.send({ok: false, reason: '鉴权失败'});
        return;
    }

    const multi = RedisClient.multi();
    multi.expire(req.body.token, 240).get(req.body.token);
    const result: any[] = await promisify(multi.exec).bind(multi)();

    if (result[0] === 0) {
        logger.log.error(`${request_id} ${req.path} token expired`);
        res.send({ok: false, reason: '鉴权失败'});
        return;
    }

    const account_id = result[1];
    await promisify(RedisClient.setex).bind(RedisClient)(account_id, 240, req.body.token);
    res.locals.account_id = account_id;
    res.locals.request_id = request_id;
    logger.log.info(`${request_id} ${req.path} pass`);
    next();
}


