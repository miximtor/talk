import * as Postgres from 'pg';
import * as express from 'express';
import {Logger} from "./log";

const logger = new Logger('PostgresPool');

export const PostgresPool = new Postgres.Pool({
    host: 'postgres',
    port: 5432,
    user: 'postgres',
    password: 'lzw981018',
    database: 'postgres'
});

export async function pool_alloc(req: express.Request, res: express.Response, next) {
    logger.log.info(`${req.method} ${req.path} await connection alloc`);
    const conn = await PostgresPool.connect();
    logger.log.info(`${req.method} ${req.path} connection alloc success`);
    res.locals.db_conn = conn;
    try {
        next();
    } finally {
        conn.release();
        logger.log.info(`${req.method} ${req.path} connection released`);
    }
}
