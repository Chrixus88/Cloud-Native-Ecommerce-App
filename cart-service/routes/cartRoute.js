const express = require("express");
const {cartItem,delCart,updateCartItem,getCart} = require("../controllers/cartController");
const cartAuthentication = require("../authentication/cartAuthentication")
const router = express.Router();


router.get("/", cartAuthentication,getCart);
router.post("/items",cartAuthentication,cartItem)


router.patch("/items/:productId",cartAuthentication,updateCartItem)
router.delete("/items/:productId", cartAuthentication, delCart)


module.exports = router