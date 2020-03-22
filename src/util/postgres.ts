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
    const conn = await PostgresPool.connect();
    res.locals.db_conn = conn;
    try {
        next();
    } finally {
        conn.release();
    }
}
