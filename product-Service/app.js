const express = require("express");
const productRoute = require("./routes/productRoute");

const app = express()


app.use(express.json())


app.use("/api/v1/products", productRoute);

app.get("/health", (req, res)=>{
    res.status(200).json({
        success: true,
        message: "Cloud Native Ecommerce API is running...",
        status: "UP",
        service: "product-service",
        version: "1.0.0"

    })
})

module.exports = app