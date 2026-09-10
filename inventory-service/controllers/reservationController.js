const { validate: isUUID } = require("uuid");
const pool = require("../database/db");

const reserveInventory = async ({
    productId,
    orderId,
    quantity
}) => {
    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const inventory = await client.query(
            `SELECT product_id, available_stock, reserved_stock
             FROM inventory
             WHERE product_id = $1
             FOR UPDATE`,
            [productId]
        );

        if (inventory.rowCount === 0) {
            throw new Error("Inventory not found");
        }

        const inventoryData = inventory.rows[0];

        if (inventoryData.available_stock < quantity) {
            throw new Error("Insufficient inventory");
        }

        await client.query(
            `UPDATE inventory
             SET available_stock = available_stock - $1,
                 reserved_stock = reserved_stock + $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE product_id = $2`,
            [quantity, productId]
        );

        const reservationDuration =
            Number(process.env.RESERVATION_DURATION_MINUTES);

        const expiresAt = new Date(
            Date.now() + reservationDuration * 60 * 1000
        );

        const reservation = await client.query(
            `INSERT INTO reservations (
                order_id,
                product_id,
                reserved_quantity,
                expires_at
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
                orderId,
                productId,
                quantity,
                expiresAt
            ]
        );

        await client.query("COMMIT");

        return reservation.rows[0];

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

        throw error;

    } finally {

        if (client) {
            client.release();
        }
    }
};

const createReservation = async (req, res, next) => {

    try {

        const {
            productId,
            orderId,
            quantity
        } = req.body;

        if (!productId || !orderId || quantity === undefined) {
            return res.status(400).json({
                success: false,
                message:
                    "productId, orderId and quantity are required"
            });
        }

        if (!isUUID(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid productId format"
            });
        }

        if (!isUUID(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid orderId format"
            });
        }

        if (
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Quantity must be a positive integer"
            });
        }

        const reservation =
            await reserveInventory({
                productId,
                orderId,
                quantity
            });

        return res.status(201).json({
            success: true,
            message:
                "Reservation created successfully",
            data: reservation
        });

    } catch (error) {

        next(error);

    }
};


const releaseReservation = async (req, res, next) => {
    let client;

    try {
        const { reservationId } = req.params;

        if (!reservationId) {
            return res.status(400).json({
                success: false,
                message: "reservation id is required"
            });
        }

        if (!isUUID(reservationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation id format"
            });
        }

        client = await pool.connect();

        await client.query("BEGIN");

        const reservation = await client.query(
            `SELECT id, product_id, reserved_quantity, status
             FROM reservations
             WHERE id = $1
             FOR UPDATE`,
            [reservationId]
        );

        if (reservation.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            });
        }

        const reservationData = reservation.rows[0];

        if (reservationData.status !== "PENDING") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Reservation cannot be released in its current state"
            });
        }

        const inventory = await client.query(
            `SELECT product_id, available_stock, reserved_stock
             FROM inventory
             WHERE product_id = $1
             FOR UPDATE`,
            [reservationData.product_id]
        );

        if (inventory.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Inventory not found"
            });
        }

        const inventoryData = inventory.rows[0];

        if (inventoryData.reserved_stock < reservationData.reserved_quantity) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message: "Reserved inventory is insufficient for this release"
            });
        }

        await client.query(
            `UPDATE inventory
             SET available_stock = available_stock + $1,
                 reserved_stock = reserved_stock - $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE product_id = $2`,
            [
                reservationData.reserved_quantity,
                reservationData.product_id
            ]
        );

        const updatedReservation = await client.query(
            `UPDATE reservations
             SET status = 'RELEASED'
             WHERE id = $1
             RETURNING *`,
            [reservationId]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Reservation released successfully",
            data: updatedReservation.rows[0]
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

const confirmReservation = async (req, res, next) => {
    let client;

    try {
        const { reservationId } = req.params;

        if (!reservationId) {
            return res.status(400).json({
                success: false,
                message: "reservation id is required"
            });
        }

        if (!isUUID(reservationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation id format"
            });
        }

        client = await pool.connect();

        await client.query("BEGIN");

        // 1. Get the pending reservation
        const reservation = await client.query(
            `SELECT *
             FROM reservations
             WHERE id = $1
             AND status = 'PENDING'
             FOR UPDATE`,
            [reservationId]
        );

        if (reservation.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Reservation not found or cannot be confirmed"
            });
        }

        const reservationData = reservation.rows[0];

        // 2. Reduce reserved stock
        const inventory = await client.query(
            `UPDATE inventory
             SET reserved_stock = reserved_stock - $1
             WHERE product_id = $2
             AND reserved_stock >= $1
             RETURNING *`,
            [
                reservationData.reserved_quantity,
                reservationData.product_id
            ]
        );

        if (inventory.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Unable to confirm reservation due to insufficient reserved inventory"
            });
        }

        // 3. Confirm the reservation
        const confirmedReservation = await client.query(
            `UPDATE reservations
             SET status = 'CONFIRMED'
             WHERE id = $1
             RETURNING *`,
            [reservationId]
        );

        // 4. Commit both changes together
        await client.query("COMMIT");

        const confirmedData = confirmedReservation.rows[0];

        return res.status(200).json({
            success: true,
            message: "Reservation confirmed successfully",
            data: {
                reservationId: confirmedData.id,
                orderId: confirmedData.order_id,
                productId: confirmedData.product_id,
                quantity: confirmedData.reserved_quantity,
                status: confirmedData.status
            }
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


const expireReservations = async () => {
    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        // Find expired pending reservations
        const reservations = await client.query(
            `SELECT id, product_id, reserved_quantity
             FROM reservations
             WHERE status = 'PENDING'
             AND expires_at <= CURRENT_TIMESTAMP
             FOR UPDATE`
        );

        for (const reservation of reservations.rows) {

            // Lock inventory
            const inventory = await client.query(
                `SELECT product_id, reserved_stock
                 FROM inventory
                 WHERE product_id = $1
                 FOR UPDATE`,
                [reservation.product_id]
            );

            if (inventory.rowCount === 0) {
                console.error(
                    `Inventory not found for reservation ${reservation.id}`
                );
                continue;
            }

            // Restore inventory
            const inventoryUpdate = await client.query(
                `UPDATE inventory
                 SET available_stock = available_stock + $1,
                     reserved_stock = reserved_stock - $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE product_id = $2
                 AND reserved_stock >= $1
                 RETURNING *`,
                [
                    reservation.reserved_quantity,
                    reservation.product_id
                ]
            );

            if (inventoryUpdate.rowCount === 0) {
                console.error(
                    `Unable to restore inventory for reservation ${reservation.id}`
                );
                continue;
            }

            // Mark reservation as expired
            await client.query(
                `UPDATE reservations
                 SET status = 'EXPIRED'
                 WHERE id = $1`,
                [reservation.id]
            );

            console.log(
                `Reservation ${reservation.id} expired successfully`
            );
        }

        await client.query("COMMIT");

    } catch (error) {

        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }

        console.error("Reservation expiration failed:", error);

    } finally {

        if (client) {
            client.release();
        }
    }
};

const processConfirmReservation = async (reservationId) => {
    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const reservation = await client.query(
            `SELECT *
             FROM reservations
             WHERE id = $1
             AND status = 'PENDING'
             FOR UPDATE`,
            [reservationId]
        );

        if (reservation.rowCount === 0) {
            throw new Error(
                "Reservation not found or cannot be confirmed"
            );
        }

        const reservationData = reservation.rows[0];

        const inventory = await client.query(
            `UPDATE inventory
             SET reserved_stock = reserved_stock - $1
             WHERE product_id = $2
             AND reserved_stock >= $1
             RETURNING *`,
            [
                reservationData.reserved_quantity,
                reservationData.product_id
            ]
        );

        if (inventory.rowCount === 0) {
            throw new Error(
                "Unable to confirm reservation"
            );
        }

        const confirmedReservation = await client.query(
            `UPDATE reservations
             SET status = 'CONFIRMED'
             WHERE id = $1
             RETURNING *`,
            [reservationId]
        );

        await client.query("COMMIT");

        return confirmedReservation.rows[0];

    } catch (error) {

        if (client) {
            await client.query("ROLLBACK");
        }

        throw error;

    } finally {

        if (client) {
            client.release();
        }
    }
};

const processReleaseReservation = async (reservationId) => {
    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const reservation = await client.query(
            `SELECT id, product_id, reserved_quantity, status
             FROM reservations
             WHERE id = $1
             FOR UPDATE`,
            [reservationId]
        );

        if (reservation.rowCount === 0) {
            throw new Error("Reservation not found");
        }

        const reservationData = reservation.rows[0];

        if (reservationData.status !== "PENDING") {
            throw new Error(
                "Reservation cannot be released in its current state"
            );
        }

        const inventory = await client.query(
            `SELECT product_id, available_stock, reserved_stock
             FROM inventory
             WHERE product_id = $1
             FOR UPDATE`,
            [reservationData.product_id]
        );

        if (inventory.rowCount === 0) {
            throw new Error("Inventory not found");
        }

        const inventoryData = inventory.rows[0];

        if (
            inventoryData.reserved_stock <
            reservationData.reserved_quantity
        ) {
            throw new Error(
                "Reserved inventory is insufficient for this release"
            );
        }

        await client.query(
            `UPDATE inventory
             SET available_stock = available_stock + $1,
                 reserved_stock = reserved_stock - $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE product_id = $2`,
            [
                reservationData.reserved_quantity,
                reservationData.product_id
            ]
        );

        const updatedReservation = await client.query(
            `UPDATE reservations
             SET status = 'RELEASED'
             WHERE id = $1
             RETURNING *`,
            [reservationId]
        );

        await client.query("COMMIT");

        return updatedReservation.rows[0];

    } catch (error) {

        if (client) {
            await client.query("ROLLBACK");
        }

        throw error;

    } finally {

        if (client) {
            client.release();
        }
    }
};
module.exports = {
    createReservation,
    releaseReservation,
    confirmReservation,
    expireReservations,
    processReleaseReservation,
    processConfirmReservation,
    reserveInventory
};