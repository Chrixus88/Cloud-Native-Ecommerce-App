const connectRabbitmq = require("./connection");
const publishInventoryReserved = require("./publisher");
const {
    reserveInventory
} = require("../controllers/reservationController");
const startInventoryConsumer = async () => {

    const channel = await connectRabbitmq();

    await channel.assertExchange(
        "order_exchange",
        "direct",
        {
            durable: true
        }
    );

    await channel.assertQueue(
        "inventory_order_queue",
        {
            durable: true
        }
    );

    await channel.bindQueue(
        "inventory_order_queue",
        "order_exchange",
        "order.created"
    );

    channel.consume(
        "inventory_order_queue",
        async (message) => {

            if (!message) {
                return;
            }

            try {

                const orderData =
                    JSON.parse(
                        message.content.toString()
                    );

                console.log(
                    "Order event received:",
                    orderData
                );

                if (
                    orderData.eventType !==
                    "ORDER_CREATED"
                ) {
                    console.log(
                        "Unknown event type"
                    );

                    channel.ack(message);

                    return;
                }

                console.log(
                    "Processing ORDER_CREATED event..."
                );

                const reservation =
                    await reserveInventory({
                        productId:
                            orderData.productId,

                        orderId:
                            orderData.orderId,

                        quantity:
                            orderData.quantity
                    });

                console.log(
                    "Reservation created:",
                    reservation
                );

                await publishInventoryReserved({
    orderId: orderData.orderId,
    reservationId: reservation.id,
    productId: reservation.product_id,
    quantity: reservation.reserved_quantity
});

                channel.ack(message);

            } catch (error) {

                console.error(
                    "Failed to process ORDER_CREATED:",
                    error
                );

                channel.nack(
                    message,
                    false,
                    false
                );
            }
        }
    );

    console.log(
        "Inventory consumer is listening for ORDER_CREATED events"
    );
};

module.exports = startInventoryConsumer;
