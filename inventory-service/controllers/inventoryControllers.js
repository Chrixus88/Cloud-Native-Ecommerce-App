
const pool = require("../database/db");
const { validate: isUUID, v4: uuidv4 } = require("uuid");

const createInventory = async (req, res, next) => {
    try {
        console.log("reached")
        const { productId, quantity } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "productId is required"
            });
        }
        console.log("bfore uuid")
        if (!isUUID(productId)) {
            console.log("inside")
            return res.status(400).json({
                success: false,
                message: "Invalid productId format"
            });
        }
console.log("uuid")
        if (quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: "quantity is required"
            });
        }
console.log("after uuid")
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "quantity must be a positive integer"
            });
        }
console.log("after number valid")
        const existingInventory = await pool.query(
            `SELECT id
             FROM inventory
             WHERE product_id = $1`,
            [productId]
        );
console.log("after db query")
        if (existingInventory.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Inventory already exists for this product"
            });
        }

        const newInventory = await pool.query(
            `INSERT INTO inventory
                (product_id, available_stock, reserved_stock)
             VALUES
                ($1, $2, $3)
             RETURNING *`,
            [productId, quantity, 0]
        );

        return res.status(201).json({
            success: true,
            message: "Inventory created successfully",
            data: newInventory.rows[0]
        });

    } catch (error) {
          console.error("DATABASE ERROR:", error);
        next(error);
    }
};

const getInventoryById = async (req,res,next)=>{
    try{
    const {productId} = req.params;

    if(!productId){
        return res.status(400).json({
            success: false,
            message: "productId is compulsory"
        })
    }

    const inventoryItem = await pool.query(`SELECT * FROM inventory WHERE product_id = $1`,[productId]);

    if(inventoryItem.rowCount === 0){
        return res.status(404).json({
            success:false,
            message: "product not found"
        })
    }

    return res.status(200).json({
        success:true,
        message: "product found",
        data: inventoryItem.rows[0]
    })
    }catch(error){
        next(error)
    }
}

const updateInventory = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "ProductId is required"
            });
        }

        if (!isUUID(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid productId format"
            });
        }

        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid quantity"
            });
        }

        const updateInventory = await pool.query(
            `UPDATE inventory
             SET available_stock = $1
             WHERE product_id = $2
             RETURNING *`,
            [quantity, productId]
        );

        if (updateInventory.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Inventory updated successfully",
            data: updateInventory.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


const deleteInventory = async (req, res, next) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "productId is required"
            });
        }

        if (!isUUID(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid productId format"
            });
        }

        const deletedInventory = await pool.query(
            `DELETE FROM inventory
             WHERE product_id = $1
             RETURNING *`,
            [productId]
        );

        if (deletedInventory.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Inventory deleted successfully",
            data: deletedInventory.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

const reduceInventory = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "productId is required"
            });
        }

        if (!isUUID(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid productId format"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid quantity"
            });
        }

        const result = await pool.query(
            `UPDATE inventory
             SET available_stock = available_stock - $1
             WHERE product_id = $2
             AND available_stock >= $1
             RETURNING *`,
            [quantity, productId]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Insufficient inventory or inventory not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Inventory reduced successfully",
            data: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

const increaseInventory = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "productId is required"
            });
        }

        if (!isUUID(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid productId format"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid quantity"
            });
        }

        const result = await pool.query(
            `UPDATE inventory
             SET available_stock = available_stock + $1
             WHERE product_id = $2
             RETURNING *`,
            [quantity, productId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Inventory increased successfully",
            data: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};




module.exports = {
    createInventory,getInventoryById,increaseInventory,reduceInventory,deleteInventory,updateInventory,getInventoryById
};