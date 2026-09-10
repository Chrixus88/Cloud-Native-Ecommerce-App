
const express = require("express");
const erroHandler = require("../cart-service/middleware/errorHandler");
const cart = require("./routes/cartRoute")


const app = express();

app.use(express.json())


app.use("/api/cart",cart)

app.get("/health", (req,res)=>{
    res.status(200).json({
        success: true,
        message: "Cloud Native Ecommerce API is running...",
        status: "UP",
        service: "cart-service",
        version: "1.0.0"

    })
})



app.use(erroHandler)




module.exports = app;