import {v4 as UUIDv4} from 'uuid';
import * as express from 'express';

export function coloring(req: express.Request, res: express.Response, next) {
    res.locals.request_id = UUIDv4();
    next();
}
