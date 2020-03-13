import * as Redis from 'redis';

class RedisConnection {
    public client: Redis.RedisClient;
    constructor() {
        this.client = Redis.createClient(6379,'redis');
    }
}

export let RedisClient = new RedisConnection().client;
