const { v4: uuidv4 } = require("uuid");

const createOutboxEvent = async (
    client,
    {
        eventType,
        aggregateType,
        aggregateId,
        payload
    }
) => {

    const eventId = uuidv4();

    await client.query(
        `INSERT INTO outbox_events
        (
            id,
            event_type,
            aggregate_type,
            aggregate_id,
            payload
        )
        VALUES ($1, $2, $3, $4, $5)`,
        [
            eventId,
            eventType,
            aggregateType,
            aggregateId,
            JSON.stringify(payload)
        ]
    );

    return eventId;
};

module.exports = {
    createOutboxEvent
};