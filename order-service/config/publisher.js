const connectRabbitmq = require("./connection");

const publishOrderCreated = async ({
    orderId,
    productId,
    quantity
}) => {
    const channel = await connectRabbitmq();

    await channel.assertExchange(
        "order_exchange",
        "direct",
        {
            durable: true
        }
    );

    const message = Buffer.from(
        JSON.stringify({
            eventType: "ORDER_CREATED",
            orderId,
            productId,
            quantity
        })
    );

    channel.publish(
        "order_exchange",
        "order.created",
        message
    );

    console.log("ORDER_CREATED event published");
};

const publishPaymentCompleted = async ({
    orderId,
    reservationId,
    paymentId
}) => {

    const channel = await connectRabbitmq();

    await channel.assertExchange(
        "payment_exchange",
        "direct",
        {
            durable: true
        }
    );

    const message = {
        eventType: "PAYMENT_COMPLETED",
        orderId,
        reservationId,
        paymentId
    };

    channel.publish(
        "payment_exchange",
        "payment.completed",
        Buffer.from(JSON.stringify(message))
    );

    console.log(
        "PAYMENT_COMPLETED event published:",
        message
    );
};

const publishPaymentFailed = async ({
    orderId,
    reservationId
}) => {

    const channel = await connectRabbitmq();

    await channel.assertExchange(
        "payment_exchange",
        "direct",
        {
            durable: true
        }
    );

    const message = {
        eventType: "PAYMENT_FAILED",
        orderId,
        reservationId
    };

    channel.publish(
        "payment_exchange",
        "payment.failed",
        Buffer.from(JSON.stringify(message))
    );

    console.log(
        "PAYMENT_FAILED event published:",
        message
    );
};

module.exports = {
    publishPaymentCompleted,
    publishPaymentFailed,publishOrderCreated
};