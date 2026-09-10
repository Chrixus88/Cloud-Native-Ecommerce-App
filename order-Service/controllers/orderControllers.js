const { application } = require("express");
const pool = require("../database/db");
const { validate: isUUID, v4: uuidv4 } = require("uuid");
const {publishOrderCreated} = require('../config/publisher')
const {createOutboxEvent} = require("../services/outboxService");

const createOrder = async (req, res, next) => {

    let client;

    try {

        const { quantity, productId } = req.body;

        // 1. Validate quantity
        if (quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: "quantity is required"
            });
        }

        // 2. Validate productId
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "productId is required"
            });
        }

        // 3. Validate productId format
        if (!isUUID(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid productId format"
            });
        }

        // 4. Validate quantity
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "quantity must be a positive integer"
            });
        }

        // 5. Generate order ID
        const orderId = uuidv4();

        // 6. Get product
        const productResponse = await fetch(
            `http://localhost:3002/api/v1/products/${productId}`
        );

        if (!productResponse.ok) {

            const errorData = await productResponse
                .json()
                .catch(() => ({}));

            return res.status(productResponse.status).json({
                success: false,
                message: "Unable to retrieve product",
                error: errorData
            });
        }

        const productResponseData =
            await productResponse.json();

        const product = productResponseData.data;

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // 7. Calculate price
        const unitPrice = Number(product.price);

        const totalAmount =
            unitPrice * quantity;

        // 8. Start transaction
        client = await pool.connect();

        await client.query("BEGIN");

        // 9. Create PENDING order
        await client.query(
            `INSERT INTO orders
            (
                id,
                user_id,
                product_id,
                quantity,
                unit_price,
                total_price,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                orderId,
                req.user.id,
                productId,
                quantity,
                unitPrice,
                totalAmount,
                "PENDING"
            ]
        );

        // 10. Create ORDER_CREATED outbox event
        await createOutboxEvent(
            client,
            {
                eventType: "ORDER_CREATED",
                aggregateType: "ORDER",
                aggregateId: orderId,
                payload: {
                    eventType: "ORDER_CREATED",
                    orderId,
                    productId,
                    quantity
                }
            }
        );

        // 11. Commit both operations together
        await client.query("COMMIT");

        client.release();
        client = null;

        // 12. Return immediately
        return res.status(202).json({
            success: true,
            message: "Order accepted for processing",
            data: {
                orderId,
                status: "PENDING"
            }
        });

    } catch (error) {

        if (client) {

            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {

                console.error(
                    "Rollback failed:",
                    rollbackError
                );
            }
        }

        next(error);

    } finally {

        if (client) {
            client.release();
        }
    }
};



const getOrderById = async (req, res, next) => {
    let client;

    try {
        const { orderId } = req.params;

        // 1. Validate presence
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "order id is required"
            });
        }

        // 2. Validate UUID
        if (!isUUID(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order id format"
            });
        }

        // 3. Connect to database
        client = await pool.connect();

        // 4. Retrieve only this user's order
        const order = await client.query(
            `SELECT *
             FROM orders
             WHERE id = $1
             AND user_id = $2`,
            [orderId, req.user.id]
        );

        // 5. Order doesn't exist / doesn't belong to user
        if (order.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "order not found"
            });
        }

        // 6. Return order
        return res.status(200).json({
            success: true,
            message: "order retrieved successfully",
            data: order.rows[0]
        });

    } catch (error) {
        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
};

const getMyOrders = async (req, res, next) => {
    let client;

    try {
        client = await pool.connect();

        const orders = await client.query(
            `SELECT *
             FROM orders
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            message: "orders retrieved successfully",
            data: orders.rows
        });

    } catch (error) {
        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
};


const cancelOrder = async (req, res, next) => {
    let client;

    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "order id is required"
            });
        }

        if (!isUUID(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order id format"
            });
        }

        client = await pool.connect();

        const orderResult = await client.query(
            `SELECT *
             FROM orders
             WHERE id = $1
             AND user_id = $2`,
            [orderId, req.user.id]
        );

        if (orderResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "order not found"
            });
        }

        const order = orderResult.rows[0];

        const cancellableStatuses = ["PENDING"];

        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: "order cannot be cancelled in its current state"
            });
        }

        if (!order.reservation_id) {
            return res.status(400).json({
                success: false,
                message: "order does not have a reservation"
            });
        }

        // Release reservation through Inventory Service
        const releaseResponse = await fetch(
            `${process.env.INVENTORY_SERVICE_URL}/api/v1/reservations/${order.reservation_id}/release`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        if (!releaseResponse.ok) {
            const errorData = await releaseResponse
                .json()
                .catch(() => ({}));

            return res.status(502).json({
                success: false,
                message: "Unable to release reservation. Order was not cancelled.",
                error: errorData
            });
        }

        // Reservation successfully released
        const updateOrder = await client.query(
            `UPDATE orders
             SET status = 'CANCELLED'
             WHERE id = $1
             AND user_id = $2
             RETURNING *`,
            [orderId, req.user.id]
        );

        return res.status(200).json({
            success: true,
            message: "order cancelled successfully",
            data: updateOrder.rows[0]
        });

    } catch (error) {
        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
}
module.exports = {cancelOrder,getMyOrders,getOrderById,createOrder}