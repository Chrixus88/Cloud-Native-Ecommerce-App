const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const {
    createProxyMiddleware,
    fixRequestBody
} = require("http-proxy-middleware");

const app = express();

app.use(helmet());
app.use(cors());

// Parse JSON bodies
app.use(express.json());


// =========================
// AUTH SERVICE
// =========================

app.use(
    "/api/auth",
    createProxyMiddleware({
        target: "http://localhost:3001",
        changeOrigin: true,
        pathRewrite: {
            "^/": "/api/v1/users/"
        },
        on: {
            proxyReq: fixRequestBody
        }
    })
);


// =========================
// ORDER SERVICE
// =========================

app.use(
    "/api/orders",
    createProxyMiddleware({
        target: "http://localhost:3006",
        changeOrigin: true,
        pathRewrite: {
            "^/": "/api/v1/orders/"
        },
        on: {
            proxyReq: fixRequestBody
        }
    })
);


// =========================
// PRODUCT SERVICE
// =========================

app.use(
    "/api/products",
    createProxyMiddleware({
        target: "http://localhost:3002",
        changeOrigin: true,
        pathRewrite: {
            "^/": "/api/v1/products/"
        },
        on: {
            proxyReq: fixRequestBody
        }
    })
);


// =========================
// HEALTH CHECK
// =========================

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Cloud Native Ecommerce API is running...",
        status: "UP",
        service: "api-gateway",
        version: "1.0.0"
    });
});


// =========================
// 404 HANDLER
// =========================

app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "not found"
    });
});


// =========================
// ERROR HANDLER
// =========================

app.use(errorHandler);


module.exports = app;