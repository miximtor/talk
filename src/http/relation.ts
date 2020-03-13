import {Logger} from "../util/log";

import * as express from 'express';

import {v4 as UUIDv4} from 'uuid';
import {PostgresPool} from "../util/postgres";

class RelationRouter {
    public router;
    private readonly router_id: string;
    private logger: Logger;

    constructor() {
        this.logger = new Logger(this.constructor.name);
        this.router = express.Router();
        this.router.use('/getcontacts', this.get_contacts);
        this.router_id = UUIDv4();
    }

    async get_contacts(req: express.Request, res: express.Response) {
        const conn = res.locals.db_conn;
        const selectQuery = "select * from talk.contacts where master_account_id = $1 and relation_identity in ($2,$3)";
        const selectParam = [res.locals.account_id, 'friend', 'admin'];
        const result = await conn.query(selectQuery, selectParam);
        result.rows.forEach(slave => delete slave.master_account_id);
        res.send({ok: true, data: result.rows});
    }
}

export const relation_router = new RelationRouter().router;
