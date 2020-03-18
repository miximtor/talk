import {WebSocketService} from "./websocket/websocket-service";
import * as express from "express";
import {account_router} from "./http/account";
import {relation_router} from "./http/relation";
import {message_router} from "./http/message";

import {Logger} from "./util/log";
import {coloring} from "./util/coloring";
import {Token} from "./util/token";
import {pool_alloc} from "./util/postgres";

function main() {
    const service = new WebSocketService();
    const app = express();
    const logger = new Logger('HTTPService');

    app.use(express.json());
    app.use(coloring);
    app.use(pool_alloc);
    app.use(Token.http_auth);
    app.use("/account", account_router);
    app.use("/relation", relation_router);
    app.use("/message", message_router);


    service.run();
    app.listen(3000, () => {
        logger.log.info('listening on port 3000');
    });
}

main();
