const express = require("express");

const {
    createReservation,
    releaseReservation,
    confirmReservation,expireReservations
} = require("../controllers/reservationController");

const router = express.Router();

router.post("/", createReservation);

router.post("/:reservationId/release", releaseReservation);

router.post("/:reservationId/confirm", confirmReservation);

module.exports = router;