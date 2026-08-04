
const express = require("express");
const authenticate = require("../middleware/authmiddleware");
const { getProfile } = require("../controllers/userControllers");
const { register,
    login,
    refreshToken,
    logOut} =require("../controllers/authController")

const router = express.Router();

router.get("/profile", authenticate, getProfile);
router.post("/register", register);
router.post("/login", login)
router.get("/logout",logOut)
router.post("/refresh",refreshToken)


module.exports = router;