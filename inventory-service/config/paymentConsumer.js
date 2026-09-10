const connectRabbitmq = require("./connection");

const {
    processReleaseReservation,
    processConfirmReservation
} = require("../controllers/reservationController");


const startPaymentConsumer = async () => {

    const channel = await connectRabbitmq();

    await channel.assertExchange(
        "payment_exchange",
        "direct",
        {
            durable: true
        }
    );

    await channel.assertQueue(
        "inventory_payment_queue",
        {
            durable: true
        }
    );

    await channel.bindQueue(
        "inventory_payment_queue",
        "payment_exchange",
        "payment.completed"
    );

    await channel.bindQueue(
        "inventory_payment_queue",
        "payment_exchange",
        "payment.failed"
    );


    channel.consume(
        "inventory_payment_queue",
        async (message) => {

            if (!message) {
                return;
            }

            try {

                const event =
                    JSON.parse(
                        message.content.toString()
                    );

                console.log(
                    "Payment event received:",
                    event
                );


                if (
                    event.eventType ===
                    "PAYMENT_COMPLETED"
                ) {

                    console.log(
                        "Confirming reservation..."
                    );

                    await processConfirmReservation(
                        event.reservationId
                    );

                    console.log(
                        "Reservation confirmed:",
                        event.reservationId
                    );
                }


                else if (
                    event.eventType ===
                    "PAYMENT_FAILED"
                ) {

                    console.log(
                        "Releasing reservation..."
                    );

                    await processReleaseReservation(
                        event.reservationId
                    );

                    console.log(
                        "Reservation released:",
                        event.reservationId
                    );
                }


                channel.ack(message);

            } catch (error) {

                console.error(
                    "Payment event processing failed:",
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
        "Inventory payment consumer is listening..."
    );
};


module.exports = startPaymentConsumer;