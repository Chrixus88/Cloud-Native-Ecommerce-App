const connectRabbitmq = require("./connection");

const publishInventoryReserved = async ({
    orderId,
    reservationId,
    productId,
    quantity
}) => {

    const channel = await connectRabbitmq();

    await channel.assertExchange(
        "inventory_exchange",
        "direct",
        {
            durable: true
        }
    );

    const message = Buffer.from(
        JSON.stringify({
            eventType: "INVENTORY_RESERVED",
            orderId,
            reservationId,
            productId,
            quantity
        })
    );

    channel.publish(
        "inventory_exchange",
        "inventory.reserved",
        message
    );

    console.log(
        "INVENTORY_RESERVED event published"
    );
};

module.exports = publishInventoryReserved;