import * as express from 'express';
import {RedisClient} from "../storage/redis";
import {Logger} from "../util/log";
import {promisify} from "util";

const logger: Logger = new Logger('AuthMiddleware');
const white_list: Array<string> =
    ['/account/login', '/account/checkloginid', '/account/register'];

export function auth(req: express.Request, res: express.Response, next) {
    logger.log.info(`${req.method} ${req.path} checking`);
    if (white_list.indexOf(req.path) !== -1) {
        next();
        return;
    }
    if (!req.body.token) {
        res.send({
            ok: false,
            reason: '鉴权失败'
        });
        return;
    }
    const multi = RedisClient.multi();
    multi
        .expire(req.body.token, 240)
        .get(req.body.token);
    const multiPromise = promisify(multi.exec).bind(multi);
    const setex = promisify(RedisClient.setex).bind(RedisClient);
    multiPromise()
        .then((results: Array<any>) => {
            if (results[0] === 0) {
                throw new Error('key expired')
            }
            setex(results[1], 240, req.body.token)
                .then(() => {
                    logger.log.info(`${results[1]} authentication pass`);
                    res.locals.login_id = results[1];
                    next();
                });
        })
        .catch((e) => {
            logger.log.error(`Redis error ${e}`);
            res.send({
                ok: false,
                reason: '鉴权失败'
            })
        });
}