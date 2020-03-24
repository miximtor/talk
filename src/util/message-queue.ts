import * as AMQP from "amqplib";

class MessageQueue {
    private push_connection: AMQP.Connection;
    private message_push_channel: AMQP.Channel;

    private receive_connection: AMQP.Connection;

    async init() {
        this.push_connection = await AMQP.connect('amqp://rabbitmq');
        this.receive_connection = await AMQP.connect('amqp://rabbitmq');

        this.message_push_channel = await this.push_connection.createChannel();
        await this.message_push_channel.assertExchange('message-exchange', 'topic', {durable: true, autoDelete: false});

    }

    async public(message, to_account_id) {
        const pending = await this.message_push_channel.publish('message-exchange', `${to_account_id}`, Buffer.from(JSON.stringify(message)), {persistent: true});
    }

    async create_queue(account_id) {
        let channel = await this.receive_connection.createChannel();
        try {
            await channel.assertQueue(`message-queue-${account_id}`, {durable: true, autoDelete: false, exclusive: false});
            await channel.bindQueue(`message-queue-${account_id}`, 'message-exchange', `${account_id}`);
        } finally {
            await channel.close();
        }
    }

    async associate_receive_queue(account_id, on_message: (msg: AMQP.ConsumeMessage) => void) {
        let channel = await  this.receive_connection.createChannel();
        await channel.consume(`message-queue-${account_id}`, on_message);
        return channel;
    }
}

export const queue = new MessageQueue();

