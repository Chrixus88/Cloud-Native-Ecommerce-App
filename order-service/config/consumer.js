const connectRabbitmq = require("./connection");
const pool = require("../database/db");

const {publishPaymentCompleted, publishPaymentFailed} = require("./publisher");


const startOrderConsumer = async () => {

    const channel = await connectRabbitmq();


    // =========================================================
    // 1. INVENTORY RESERVED CONSUMER
    // =========================================================

    await channel.assertExchange(
        "inventory_exchange",
        "direct",
        {
            durable: true
        }
    );

    await channel.assertQueue(
        "order_inventory_queue",
        {
            durable: true
        }
    );

    await channel.bindQueue(
        "order_inventory_queue",
        "inventory_exchange",
        "inventory.reserved"
    );


    channel.consume(
        "order_inventory_queue",
        async (message) => {

            if (!message) {
                return;
            }

            let client;

            try {

                const inventoryData =
                    JSON.parse(
                        message.content.toString()
                    );

                console.log(
                    "Inventory event received:",
                    inventoryData
                );


                // Ignore unknown events

                if (
                    inventoryData.eventType !==
                    "INVENTORY_RESERVED"
                ) {

                    console.log(
                        "Unknown inventory event"
                    );

                    channel.ack(message);

                    return;
                }


                // =================================================
                // Get order
                // =================================================

                client = await pool.connect();

                await client.query("BEGIN");


                const orderResult = await client.query(
                    `SELECT *
                     FROM orders
                     WHERE id = $1`,
                    [inventoryData.orderId]
                );


                if (orderResult.rowCount === 0) {

                    throw new Error(
                        `Order ${inventoryData.orderId} not found`
                    );
                }


                const order = orderResult.rows[0];


                // =================================================
                // Save reservation
                // =================================================

                await client.query(
                    `UPDATE orders
                     SET reservation_id = $1,
                         status = 'AWAITING_PAYMENT'
                     WHERE id = $2`,
                    [
                        inventoryData.reservationId,
                        inventoryData.orderId
                    ]
                );


                await client.query("COMMIT");

                client.release();
                client = null;


                console.log(
                    "Reservation ID saved to order:",
                    inventoryData.reservationId
                );


                // =================================================
                // Process payment
                // =================================================

                const paymentResponse = await fetch(
                    `${process.env.PAYMENT_SERVICE_URL}/payments/purchase`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            orderId:
                                inventoryData.orderId,

                            totalAmount:
                                Number(order.total_price)
                        })
                    }
                );


                // =================================================
                // Payment failed
                // =================================================

                if (!paymentResponse.ok) {

                    client = await pool.connect();

                    await client.query("BEGIN");


                    await client.query(
                        `UPDATE orders
                         SET status = 'FAILED'
                         WHERE id = $1`,
                        [inventoryData.orderId]
                    );


                    await client.query("COMMIT");

                    client.release();
                    client = null;


                    await publishPaymentFailed({
                        orderId:
                            inventoryData.orderId,

                        reservationId:
                            inventoryData.reservationId
                    });


                    channel.ack(message);

                    return;
                }


                // =================================================
                // Payment succeeded
                // =================================================

                const paymentData =
                    await paymentResponse.json();


                const paymentId =
                    paymentData.data.id;


                client = await pool.connect();

                await client.query("BEGIN");


                await client.query(
                    `UPDATE orders
                     SET payment_id = $1,
                         status = 'PAYMENT_COMPLETED'
                     WHERE id = $2`,
                    [
                        paymentId,
                        inventoryData.orderId
                    ]
                );


                await client.query("COMMIT");

                client.release();
                client = null;


                // =================================================
                // Publish PAYMENT_COMPLETED
                // =================================================

                await publishPaymentCompleted({
                    orderId:
                        inventoryData.orderId,

                    reservationId:
                        inventoryData.reservationId,

                    paymentId
                });


                console.log(
                    "Payment completed for order:",
                    inventoryData.orderId
                );


                channel.ack(message);

            } catch (error) {

                console.error(
                    "Failed to process inventory event:",
                    error
                );


                if (client) {

                    try {

                        await client.query("ROLLBACK");

                    } catch (rollbackError) {

                        console.error(
                            "Rollback failed:",
                            rollbackError
                        );
                    }
                }


                channel.nack(
                    message,
                    false,
                    false
                );

            } finally {

                if (client) {
                    client.release();
                }
            }
        }
    );


    // =========================================================
    // 2. PAYMENT COMPLETED CONSUMER
    // =========================================================

    await channel.assertExchange(
        "payment_exchange",
        "direct",
        {
            durable: true
        }
    );


    await channel.assertQueue(
        "order_payment_queue",
        {
            durable: true
        }
    );


    await channel.bindQueue(
        "order_payment_queue",
        "payment_exchange",
        "payment.completed"
    );


    channel.consume(
        "order_payment_queue",
        async (message) => {

            if (!message) {
                return;
            }

            let client;

            try {

                const paymentData =
                    JSON.parse(
                        message.content.toString()
                    );


                console.log(
                    "Payment event received:",
                    paymentData
                );


                // Ignore unknown events

                if (
                    paymentData.eventType !==
                    "PAYMENT_COMPLETED"
                ) {

                    console.log(
                        "Unknown payment event"
                    );

                    channel.ack(message);

                    return;
                }


                const {
                    orderId,
                    paymentId
                } = paymentData;


                if (!orderId || !paymentId) {

                    throw new Error(
                        "PAYMENT_COMPLETED event is missing orderId or paymentId"
                    );
                }


                // =================================================
                // Update order
                // =================================================

                client = await pool.connect();

                await client.query("BEGIN");


                const result = await client.query(
                    `UPDATE orders
                     SET status = 'CONFIRMED'
                     WHERE id = $1
                     AND payment_id = $2
                     AND status = 'PAYMENT_COMPLETED'
                     RETURNING id, status`,
                    [
                        orderId,
                        paymentId
                    ]
                );


                await client.query("COMMIT");


                if (result.rowCount === 0) {

                    console.log(
                        `Order ${orderId} was not updated. ` +
                        `It may already be confirmed or payment data does not match.`
                    );

                } else {

                    console.log(
                        `Order ${orderId} marked as CONFIRMED`
                    );
                }


                client.release();
                client = null;


                // =================================================
                // Acknowledge message
                // =================================================

                channel.ack(message);

            } catch (error) {

                console.error(
                    "Failed to process PAYMENT_COMPLETED event:",
                    error
                );


                if (client) {

                    try {

                        await client.query("ROLLBACK");

                    } catch (rollbackError) {

                        console.error(
                            "Rollback failed:",
                            rollbackError
                        );
                    }
                }


                /*
                 * Reject the message.
                 * Do not requeue here because your
                 * retry/DLQ strategy handles failures.
                 */

                channel.nack(
                    message,
                    false,
                    false
                );

            } finally {

                if (client) {
                    client.release();
                }
            }
        }
    );


    console.log(
        "Order consumer is listening for inventory events"
    );

    console.log(
        "Order consumer is listening for payment events"
    );
};


module.exports = startOrderConsumer;
