const express = require("express");
const authenticateUser = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const {
    createProduct,
    getProducts,
    getProductById,
    updateProductById,
    deleteProductById,
} = require("../controllers/productController");

const router = express.Router();

router.post("/",authenticateUser,authorize("user"), createProduct);

router.get("/", getProducts);

router.get("/:id", getProductById);

router.patch("/:id",authenticateUser,authorize("user"), updateProductById);

router.delete("/:id",authenticateUser,authorize("user"), deleteProductById);

module.exports = router;
