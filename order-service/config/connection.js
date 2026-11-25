const amqplib = require("amqplib");

const connectRabbitmq = async () => {
    const connection = await amqplib.connect(
        process.env.RABBITMQ_URL
    );

    const channel = await connection.createChannel();

    return channel;
};

module.exports = connectRabbitmq;