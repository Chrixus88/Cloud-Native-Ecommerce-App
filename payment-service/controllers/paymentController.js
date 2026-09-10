const { validate: isUUID, v4: uuidv4 } = require("uuid");
const pool = require("../database/db")

const processPayment = async (amount) => {

    await new Promise(resolve => setTimeout(resolve, 1000));

    const paymentSuccessful = Math.random() >= 0.2;

    if (!paymentSuccessful) {
        return {
            success: false,
            provider: "MOCK_PROVIDER",
            providerReference: null
        };
    }

    return {
        success: true,
        provider: "MOCK_PROVIDER",
        providerReference: `MOCK_${uuidv4()}`
    };
};

const createPayment = async (req, res, next) => {
    let client;

    try {
        const { orderId, totalAmount } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "orderId is required"
            });
        }

        if (totalAmount === undefined) {
            return res.status(400).json({
                success: false,
                message: "totalAmount is required"
            });
        }

        if (!isUUID(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid orderId format"
            });
        }

        if (
            typeof totalAmount !== "number" ||
            !Number.isFinite(totalAmount) ||
            totalAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "totalAmount must be a positive number"
            });
        }

        client = await pool.connect();

        await client.query("BEGIN");

        // Check for an existing payment for this order
        const existingPayment = await client.query(
            `SELECT *
             FROM payments
             WHERE order_id = $1
             FOR UPDATE`,
            [orderId]
        );

        if (existingPayment.rowCount > 0) {

            const payment = existingPayment.rows[0];

            if (payment.status === "SUCCESS") {
                await client.query("COMMIT");

                return res.status(200).json({
                    success: true,
                    message: "Payment already processed",
                    data: payment
                });
            }

            if (payment.status === "PENDING") {
                await client.query("ROLLBACK");

                return res.status(409).json({
                    success: false,
                    message: "Payment is already being processed",
                    data: payment
                });
            }
        }

        const paymentId = uuidv4();

        await client.query(
            `INSERT INTO payments (
                id,
                order_id,
                amount,
                status
            )
            VALUES ($1, $2, $3, $4)`,
            [
                paymentId,
                orderId,
                totalAmount,
                "PENDING"
            ]
        );

        const paymentResult = await processPayment(totalAmount);

        if (!paymentResult.success) {

            const failedPayment = await client.query(
                `UPDATE payments
                 SET status = 'FAILED',
                     provider = $1,
                     updated_at = NOW()
                 WHERE id = $2
                 RETURNING *`,
                [
                    paymentResult.provider,
                    paymentId
                ]
            );

            await client.query("COMMIT");

            return res.status(402).json({
                success: false,
                message: "Payment processing failed",
                data: failedPayment.rows[0]
            });
        }

        const updatedPayment = await client.query(
            `UPDATE payments
             SET status = 'SUCCESS',
                 provider = $1,
                 provider_reference = $2,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [
                paymentResult.provider,
                paymentResult.providerReference,
                paymentId
            ]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Payment processed successfully",
            data: updatedPayment.rows[0]
        });

    } catch (error) {

        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }

        next(error);

    } finally {

        if (client) {
            client.release();
        }
    }
};


const getPaymentById = async (req, res, next) => {
    let client;

    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: "paymentId is required"
            });
        }

        if (!isUUID(paymentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid paymentId format"
            });
        }

        client = await pool.connect();

        const payment = await client.query(
            `SELECT *
             FROM payments
             WHERE id = $1`,
            [paymentId]
        );

        if (payment.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment retrieved successfully",
            data: payment.rows[0]
        });

    } catch (error) {
        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
};

const getPaymentByOrderId = async (req, res, next) => {
    let client;

    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "orderId is required"
            });
        }

        if (!isUUID(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid orderId format"
            });
        }

        client = await pool.connect();

        const payment = await client.query(
            `SELECT *
             FROM payments
             WHERE order_id = $1`,
            [orderId]
        );

        if (payment.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found for this order"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment retrieved successfully",
            data: payment.rows[0]
        });

    } catch (error) {
        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
};

const refundPayment = async (req, res, next) => {
    let client;

    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: "paymentId is required"
            });
        }

        if (!isUUID(paymentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid paymentId format"
            });
        }

        client = await pool.connect();

        await client.query("BEGIN");

        const payment = await client.query(
            `SELECT *
             FROM payments
             WHERE id = $1
             FOR UPDATE`,
            [paymentId]
        );

        if (payment.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const existingPayment = payment.rows[0];

        if (existingPayment.status !== "SUCCESS") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Only successful payments can be refunded"
            });
        }

        // Mock refund processing
        const refundSuccessful = true;

        if (!refundSuccessful) {
            await client.query("ROLLBACK");

            return res.status(502).json({
                success: false,
                message: "Refund processing failed"
            });
        }

        const refundedPayment = await client.query(
            `UPDATE payments
             SET status = 'REFUNDED',
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [paymentId]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Payment refunded successfully",
            data: refundedPayment.rows[0]
        });

    } catch (error) {

        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }

        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
};


module.exports = {createPayment,getPaymentById,refundPayment,getPaymentByOrderId}