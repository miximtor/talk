import {getLogger, configure} from "log4js";
export class Logger {
    public log;
    constructor(category: string, level: string = 'all') {
        this.log = getLogger(category);
        this.log.level = level;
    }
}