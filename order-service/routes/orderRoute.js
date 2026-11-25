const express = require("express");
const router = express.Router();

const authentication = require("../middleware/authentcation");

const {
    createOrder,
    cancelOrder,
    getMyOrders,
    getOrderById
} = require("../controllers/orderControllers");


router.post(
    "/create",
    authentication,
    createOrder
);

router.get(
    "/get",
    authentication,
    getMyOrders
);

router.get(
    "/get/:orderId",
    authentication,
    getOrderById
);

router.patch(
    "/update/:orderId/cancel",
    authentication,
    cancelOrder
);


module.exports = router;