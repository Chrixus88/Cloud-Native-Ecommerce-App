require("dotenv").config();

const express = require("express");

const errorHandler = require("../inventory-service/middleware/errorHandler");

const app = express();

const inventory = require("./routes/inventoryRoutes");
const reservations = require("./routes/reservationRoute");

const {
    expireReservations
} = require("./controllers/reservationController");

app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Cloud Native Ecommerce API is running...",
        status: "UP",
        service: "inventory-service",
        version: "1.0.0"
    });
});

app.use("/api/v1/inventory", inventory);

app.use("/api/v1/reservations", reservations);

app.use(errorHandler);

setInterval(() => {
    expireReservations();
}, 10000);

module.exports = app;