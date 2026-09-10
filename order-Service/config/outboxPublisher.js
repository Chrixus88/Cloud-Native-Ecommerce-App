const pool = require("../database/db");
const connectRabbitmq = require("./connection");

const publishOutboxEvents = async () => {

    const channel = await connectRabbitmq();

    await channel.assertExchange(
        "order_exchange",
        "direct",
        {
            durable: true
        }
    );

    const result = await pool.query(
        `SELECT *
         FROM outbox_events
         WHERE published_at IS NULL
         ORDER BY created_at ASC
         LIMIT 10`
    );

    for (const event of result.rows) {

        try {

            channel.publish(
                "order_exchange",
                "order.created",
                Buffer.from(
                    JSON.stringify(event.payload)
                )
            );

            await pool.query(
                `UPDATE outbox_events
                 SET published_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [event.id]
            );

            console.log(
                `Outbox event published: ${event.event_type}`
            );

        } catch (error) {

            console.error(
                `Failed to publish outbox event ${event.id}:`,
                error
            );
        }
    }
};

module.exports = publishOutboxEvents;