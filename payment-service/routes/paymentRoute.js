const express = require("express");

const {
    createPayment,
    getPaymentById,
    getPaymentByOrderId,
    refundPayment
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/purchase", createPayment);

router.get("/:paymentId", getPaymentById);

router.get("/order/:orderId", getPaymentByOrderId);

router.post("/:paymentId/refund", refundPayment);

module.exports = router;