
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth_middleware");
const { createTransfer } = require("../controllers/transfer_controller");

router.post("/", authenticate, createTransfer);

module.exports = router;
