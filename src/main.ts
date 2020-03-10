import {WebSocketService} from "./websocket/websocket-service";
import * as express from "express";
import {account_router} from "./http/account";
import {Logger} from "./util/log";
import {auth} from "./http/session";

function main() {
    const service = new WebSocketService();
    const app = express();
    const logger = new Logger('HTTPService');
    app.use((req, res, next) => {
        next();
    });
    app.use(express.json());
    app.use(auth);
    app.use("/account", account_router);
    service.run();
    app.listen(3000, ()=>{
        logger.log.info('listening on port 3000');
    });
}

main();