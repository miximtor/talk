import {v4 as UUIDv4} from 'uuid';
import * as express from 'express';

export function coloring(req: express.Request, res: express.Response, next) {
    res.locals.request_id = UUIDv4();
    try {
        next();
    } catch (e) {
        console.log(e);
        res.send({
            ok: false,
            reason: e.message
        });
    }
}
