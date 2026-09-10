let { validate: isUUID, v4: uuidv4 } = require("uuid");
const {redis} = require("../redis/redisClient");

const cartItem = async (req, res, next) => {

    try {
        const { productId, quantity } = req.body;


        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "product id is required"
            });
        }

        if (quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: "quantity is required"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "quantity must be an integer greater than zero"
            });
        }
        if (!isUUID(productId)) {

            return res.status(400).json({
                success: false,
                message: "Invalid productId format"
            });
        }
        const productApi = await fetch(
            `http://localhost:3002/api/v1/products/${productId}`,
            {
                method: "GET"
            }
        );
        console.log("api reached")
        if (!productApi.ok) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const receivedApi = await productApi.json();
        console.log("product service response", receivedApi)

        if (
            typeof receivedApi.data.stock !== "number" ||
            receivedApi.data.stock < 0
        ) {
            return res.status(502).json({
                success: false,
                message: "Invalid stock information from Product Service"
            });
        }

        const cartKey = `cart:${req.user.id}`;

        const retrieve = await redis.hGet(
            cartKey,
            productId
        );

        const currentQuantity = retrieve === null
            ? 0
            : Number(retrieve);

        const combinedVal = currentQuantity + quantity;

        if (combinedVal > receivedApi.stock) {
            return res.status(400).json({
                success: false,
                message: "Insufficient stock"
            });
        }

        const updatedQuantity = await redis.hIncrBy(
            cartKey,
            productId,
            quantity
        );

        const CART_TTL = 7 * 24 * 60 * 60;

        await redis.expire(
            cartKey,
            CART_TTL
        );

        return res.status(200).json({
            success: true,
            message: "Cart updated successfully",
            productId,
            quantity: updatedQuantity
        });

    } catch (error) {
        next(error);
    }
};

const updateCartItem = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "product id is required"
            });
        }

        if (!isUUID(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid productId format"
            });
        }

        if (quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: "quantity is required"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "quantity must be an integer greater than zero"
            });
        }

        const productApi = await fetch(
            `http://localhost:3002/api/v1/products/${productId}`,
            {
                method: "GET"
            }
        );

        if (!productApi.ok) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const product = await productApi.json();

        if (
            typeof product.data.stock !== "number" ||
            product.data.stock < 0
        ) {
            return res.status(502).json({
                success: false,
                message: "Invalid stock information from Product Service"
            });
        }

        if (quantity > product.data.stock) {
            return res.status(400).json({
                success: false,
                message: "Insufficient stock"
            });
        }

        const cartKey = `cart:${req.user.id}`;

        const existingItem = await redis.hGet(
            cartKey,
            productId
        );

        if (existingItem === null) {
            return res.status(404).json({
                success: false,
                message: "Product is not in the cart"
            });
        }

        await redis.hSet(
            cartKey,
            productId,
            quantity
        );

        const CART_TTL = 7 * 24 * 60 * 60;

        await redis.expire(
            cartKey,
            CART_TTL
        );

        return res.status(200).json({
            success: true,
            message: "Cart item updated successfully",
            productId,
            quantity
        });

    } catch (error) {
        next(error);
    }
};

const getCart = async (req,res,next)=>{
    try {
        const retrieveItems = await redis.hGetAll(`cart:${req.user.id}`);
        if(Object.entries(retrieveItems)?.length < 1){
            return res.status(200).json({
                success: true,
                message: "cart is empty",
                data: retrieveItems
            })
        }
        return res.status(200).json({
            success: true,
            message: "cart retrieved successfully",
            data: retrieveItems
        })

    } catch (error) {
        next(error)
    }
}

const delCart = async (req, res, next) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "product id is required"
            });
        }

        if (!isUUID(productId)) {
            return res.status(400).json({
                success: false,
                message: "invalid productId format"
            });
        }

        const cartKey = `cart:${req.user.id}`;

        // Check if the product exists in the cart
        const getProduct = await redis.hGet(cartKey, productId);

        if (getProduct === null) {
            return res.status(404).json({
                success: false,
                message: "product is not in the cart"
            });
        }

        // Delete the product from the cart
        const deleted = await redis.hDel(cartKey, productId);

        if (deleted === 0) {
            return res.status(404).json({
                success: false,
                message: "product could not be deleted from cart"
            });
        }

        return res.status(200).json({
            success: true,
            message: "product removed from cart successfully"
        });

    } catch (error) {
        next(error);
    }
};


module.exports = {cartItem,delCart,updateCartItem,getCart};