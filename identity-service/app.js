const express = require("express");
const erroHandler = require("./middleware/errorHandler")
const app = express()
const cookieParser = require("cookie-parser")
const userRoute = require("./routes/userRoute")

app.use(cookieParser())
app.use(express.json())


app.get("/health", (req,res)=>{
    res.status(200).json({
        success: true,
        message: "Cloud Native Ecommerce API is running...",
        status: "UP",
        service: "identity-service",
        version: "1.0.0"

    })
})


app.use("/api/v1/users", userRoute);

app.use((req,res)=>{
    return res.status(404).json({
        success: false,
        message: "not found"
    })
})

app.use(erroHandler)


module.exports = app

