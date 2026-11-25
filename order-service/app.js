const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const orderRoutes = require("./routes/orderRoute");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "order Service is healthy"
    });
});

app.use("/api/v1/orders", orderRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

app.use((error, req, res, next) => {
    console.error(error);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

module.exports = app;