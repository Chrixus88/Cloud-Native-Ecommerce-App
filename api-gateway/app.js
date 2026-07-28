const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler")

const app = express();

app.use(helmet);
app.use(cors);
app.use(express.json)


app.get("/health", (req,res)=>{
    res.status(200).json({
        success: true,
        message: "Cloud Native Ecommerce API is running...",
        status: "UP",
        service: "api-gateway",
        version: "1.0.0"

    })
})



app.use((req,res)=>{
    return res.status(404).json({
        success: false,
        message: "not found"
    })
})

app.use(errorHandler)



module.exports = app