
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth_middleware");
const { getWallet } = require("../controllers/wallet_controller");

router.get("/", authenticate, getWallet);

module.exports = router;
