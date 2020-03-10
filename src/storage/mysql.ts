import {createConnection} from 'mysql2';
export const MySQLClient = createConnection({
    host: 'mysql',
    user: 'root',
    password: 'lzw981018',
    database: 'talk'
}).promise();

