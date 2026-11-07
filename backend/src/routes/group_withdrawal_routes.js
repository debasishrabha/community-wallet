
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth_middleware");

const {
    requestWithdrawal,
    reviewWithdrawal,
    getGroupWallet
} = require("../controllers/group_withdrawal_controller");

// Create withdrawal request
router.post(
    "/:groupId/withdrawals",
    authenticate,
    requestWithdrawal
);

// Approve withdrawal
router.post(
    "/:groupId/withdrawals/:withdrawalId/approve",
    authenticate,
    (req, res, next) => {
        req.body = req.body || {};
        req.body.action = "APPROVE";
        next();
    },
    reviewWithdrawal
);

// Reject withdrawal
router.post(
    "/:groupId/withdrawals/:withdrawalId/reject",
    authenticate,
    (req, res, next) => {
        req.body = req.body || {};
        req.body.action = "REJECT";
        next();
    },
    reviewWithdrawal
);

// Get group wallet
router.get(
    "/:groupId/wallet",
    authenticate,
    getGroupWallet
);

module.exports = router;
