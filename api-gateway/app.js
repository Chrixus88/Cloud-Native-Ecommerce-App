const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler")
const httpProxyMiddleware = require("http-proxy-middleware");


const app = express();

app.use(helmet());
app.use(cors());

app.use(
    "/api/auth",
    httpProxyMiddleware.createProxyMiddleware({
        target: "http://localhost:3001",
        changeOrigin: true,
        pathRewrite: {
            "^/": "/api/v1/users/"
        }
    })
);

app.use(
  "/api/products",
  httpProxyMiddleware.createProxyMiddleware({
    target: "http://localhost:3002",
    changeOrigin: true,
    pathRewrite: {
      "^/": "/api/v1/products/"
    }
  })
);


app.use(express.json())


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