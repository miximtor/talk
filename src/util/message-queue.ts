import * as AMQP from "amqplib";

class MessageQueue {
    private static readonly MESSAGE_EXCHANGE = 'message-exchange';

    private connection: AMQP.Connection;
    private push_channel: AMQP.Channel;
    private operation_channel: AMQP.Channel;


    async init() {
        this.connection = await AMQP.connect('amqp://rabbitmq');
        this.push_channel = await this.connection.createChannel();
        this.operation_channel = await this.connection.createChannel();
        await this.push_channel.assertExchange(MessageQueue.MESSAGE_EXCHANGE, 'topic', {
            durable: true,
            autoDelete: false
        });
    }

    async public(to, message) {
        await this.push_channel.publish(MessageQueue.MESSAGE_EXCHANGE, `${to}`, Buffer.from(JSON.stringify(message), 'utf8'));
    }

    async create_queue(account_id) {
        await this.operation_channel.assertQueue(`message-queue-${account_id}`, {
            durable: true,
            autoDelete: false,
            exclusive: false,
            arguments: {'x-queue-mode': 'lazy'}});
        await this.operation_channel.bindQueue(`message-queue-${account_id}`, 'message-exchange', `${account_id}`);
    }

    async create_receive_channel() {
        return await this.connection.createChannel();
    }

}

export const queue = new MessageQueue();

