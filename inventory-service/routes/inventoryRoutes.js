const express = require("express");

const {
    createInventory,
    getInventoryById,
    increaseInventory,
    reduceInventory,
    deleteInventory,
    updateInventory
} = require("../controllers/inventoryControllers");

const router = express.Router();

router.post("/create", createInventory);

router.get("/:productId", getInventoryById);
router.patch("/increase/:productId", increaseInventory)
router.patch("/reduce/:productId", reduceInventory);
router.patch("/update/:productId", updateInventory);
router.patch("/delete/:productId", deleteInventory)
module.exports = router;
