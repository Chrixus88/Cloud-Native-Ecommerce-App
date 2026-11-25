const pool = require("../config/db")


const createProduct = async (req, res, next) => {
    let client
    try{
    

    const {name,
description,
price,
stock} = req.body;

//Validate input

if(!name ||price == undefined || stock == undefined){
    return res.status(400).json({
        success: false,
        message: "Inputs are required"
    })
}

//validate non-negatuve values

if(price <= 0){
    return res.status(400).json({
        success: false,
        message: "Price must be positive value"
    })
}


if(stock < 0){
    return res.status(400).json({
        success: false,
        message: "stock cannot be negative"
    })
}
        client = await pool.connect()


const newProduct = await client.query(`INSERT INTO products(name,
description,
price,
stock) VALUES($1,$2,$3,$4) RETURNING id,name,
description,
price,
stock,
    created_at,
    updated_at`, [name,
description,
price,
stock])

return res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: newProduct.rows[0]
})


    }catch(e){
        next(e)
        
    }finally{
        if(client)
       client.release()
    }

}; 

const getProducts = async (req, res, next) => {
    try {


        const search = req.query.search;
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;

        const sort = (req.query.sort || "created_at").toLowerCase();
        const order = (req.query.order || "desc").toLowerCase();

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        // Validate pagination
        if (
            !Number.isInteger(page) ||
            !Number.isInteger(limit) ||
            page < 1 ||
            limit < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination values."
            });
        }

        // Validate price filters
        let parsedMinPrice;
        let parsedMaxPrice;

        if (minPrice !== undefined) {
            parsedMinPrice = Number(minPrice);

            if (
                !Number.isFinite(parsedMinPrice) ||
                parsedMinPrice < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "minPrice must be a valid non-negative number."
                });
            }
        }

        if (maxPrice !== undefined) {
            parsedMaxPrice = Number(maxPrice);

            if (
                !Number.isFinite(parsedMaxPrice) ||
                parsedMaxPrice < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "maxPrice must be a valid non-negative number."
                });
            }
        }

        // Validate price range
        if (
            parsedMinPrice !== undefined &&
            parsedMaxPrice !== undefined &&
            parsedMinPrice > parsedMaxPrice
        ) {
            return res.status(400).json({
                success: false,
                message: "minPrice cannot be greater than maxPrice."
            });
        }

        // Validate sorting
        const allowedValues = [
            "price",
            "name",
            "stock",
            "created_at"
        ];

        const allowedOrder = [
            "asc",
            "desc"
        ];

        if (
            !allowedValues.includes(sort) ||
            !allowedOrder.includes(order)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid sort field or order."
            });
        }

        const offset = (page - 1) * limit;

        const conditions = [];
        const values = [];

        if (search) {
            values.push(`%${search}%`);
            conditions.push(`name ILIKE $${values.length}`);
        }

        if (parsedMinPrice !== undefined) {
            values.push(parsedMinPrice);
            conditions.push(`price >= $${values.length}`);
        }

        if (parsedMaxPrice !== undefined) {
            values.push(parsedMaxPrice);
            conditions.push(`price <= $${values.length}`);
        }

        let query = `
            SELECT
                id,
                name,
                description,
                price,
                stock,
                created_at,
                updated_at
            FROM products
        `;

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }

        query += `
            ORDER BY ${sort} ${order.toUpperCase()}
        `;

        values.push(limit);
        const limitPlaceholder = values.length;

        values.push(offset);
        const offsetPlaceholder = values.length;

        query += `
            LIMIT $${limitPlaceholder}
            OFFSET $${offsetPlaceholder}
        `;

        const items = await pool.query(query, values);

        // Count matching products
        let countQuery = `
            SELECT COUNT(*)
            FROM products
        `;

        if (conditions.length > 0) {
            countQuery += ` WHERE ${conditions.join(" AND ")}`;
        }

        const countValues = values.slice(0, values.length - 2);

        const totalResult = await pool.query(
            countQuery,
            countValues
        );

        const totalProducts = Number(
            totalResult.rows[0].count
        );

        const totalPages = Math.ceil(
            totalProducts / limit
        );

        return res.status(200).json({
            success: true,
            message: "Products found.",
            page,
            limit,
            totalProducts,
            totalPages,
            count: items.rowCount,
            data: items.rows
        });

    } catch (error) {
        next(error);
    }
};


const getProductById = async (req, res, next) => {
    let client;

    try {
        const { id } = req.params;

        // Check that an ID was provided
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Please provide a product ID"
            });
        }

        // Validate UUID format
        const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidPattern.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        client = await pool.connect();

        const product = await client.query(
            `SELECT id, name, description, stock, price
             FROM products
             WHERE id = $1`,
            [id]
        );

        if (product.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product found",
            data: product.rows[0]
        });

    } catch (e) {
        next(e);
    } finally {
        if (client) {
            client.release();
        }
    }
};



const updateProductById = async (req, res, next) => {
    let client;

    try {
        const { id } = req.params;

        // Validate UUID format
        const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidPattern.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const allowedFields = ["name", "price", "stock"];
        const fields = Object.keys(req.body);

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields provided for update"
            });
        }

        // Validate supplied field names
        const validFields = fields.every(field =>
            allowedFields.includes(field)
        );

        if (!validFields) {
            return res.status(400).json({
                success: false,
                message: "Invalid input field"
            });
        }

        // Validate price only if supplied
        if ("price" in req.body && req.body.price <= 0) {
            return res.status(400).json({
                success: false,
                message: "Price must be greater than zero"
            });
        }

        // Validate stock only if supplied
        if ("stock" in req.body && req.body.stock < 0) {
            return res.status(400).json({
                success: false,
                message: "Stock cannot be negative"
            });
        }

        client = await pool.connect();

        await client.query("BEGIN");

        // Build dynamic SET clause
        const setClause = fields
            .map((field, index) => `${field} = $${index + 1}`)
            .join(", ");

        const values = fields.map(field => req.body[field]);

        values.push(id);

        const query = `
            UPDATE products
            SET ${setClause},
                updated_at = NOW()
            WHERE id = $${values.length}
            RETURNING *;
        `;

        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: result.rows[0]
        });

    } catch (error) {
        if (client) {
            await client.query("ROLLBACK");
        }

        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
};

const deleteProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate UUID format
        const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidPattern.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }


        const result = await pool.query(
            `DELETE FROM products
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
            product: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProductById,
    deleteProductById
};