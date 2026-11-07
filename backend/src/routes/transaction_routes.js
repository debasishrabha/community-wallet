
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth_middleware");
const {
    getTransactions
} = require("../controllers/transaction_controller");

router.get("/", authenticate, getTransactions);

module.exports = router;
