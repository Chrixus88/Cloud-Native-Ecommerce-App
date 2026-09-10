require("dotenv").config();

const app = require("./app");
const startOrderConsumer = require("./config/consumer");
const publishOutboxEvents = require("./config/outboxPublisher");

const PORT = process.env.PORT || 3006;

startOrderConsumer();

setInterval(
    publishOutboxEvents,
    5000
);

app.listen(PORT, () => {
    console.log(
        `Order Service running on port ${PORT}`
    );
});