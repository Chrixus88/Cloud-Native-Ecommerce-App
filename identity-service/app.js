const express = require("express");
const erroHandler = require("./middleware/errorHandler")
const app = express()


app.get("/health", (req,res)=>{
    res.status(200).json({
        success: true,
        message: "Cloud Native Ecommerce API is running...",
        status: "UP",
        service: "identity-service",
        version: "1.0.0"

    })
})

app.use((req,res)=>{
    return res.status(404).json({
        success: false,
        message: "not found"
    })
})

app.use(erroHandler)


module.exports = app

