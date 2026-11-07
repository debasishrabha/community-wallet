
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const prisma = require("./config/prisma");
const groupRoutes = require("./routes/group_routes");
const groupContributionRoutes = require("./routes/group_contribution_routes");
const groupWithdrawalRoutes = require("./routes/group_withdrawal_routes");
const expireGroupWithdrawals = require("./utils/expire_group_withdrawals");

const authRoutes = require("./routes/auth_routes");
const otpRoutes = require("./routes/otp_routes");
const transferRoutes = require("./routes/transfer_routes");
const walletRoutes = require("./routes/wallet_routes");
const transactionRoutes = require("./routes/transaction_routes");
const groupMemberRoutes = require("./routes/group_member_routes");
const adminRoutes = require("./routes/admin_routes");



const app = express();

// Middleware must come before routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/auth", authRoutes);
app.use("/auth/otp", otpRoutes);
app.use("/transfers", transferRoutes);
app.use("/wallet", walletRoutes);
app.use("/transactions", transactionRoutes);
app.use("/groups", groupRoutes);
app.use("/groups", groupMemberRoutes);
app.use("/groups", groupContributionRoutes);
app.use("/groups", groupWithdrawalRoutes);
app.use("/admin", adminRoutes);

// Health check
app.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            success: true,
            message: "Community Wallet API is running",
            database: "Connected"
        });
    } catch (error) {
        console.error("Health check failed:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});
const authenticate = require("./middleware/auth_middleware");

app.get("/auth/me", authenticate, (req, res) => {
    res.json({
        success: true,
        userId: req.user.userId
    });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Check expired withdrawal requests every 60 seconds
setInterval(async () => {
    try {
        await expireGroupWithdrawals();
    } catch (error) {
        console.error("Expiry scheduler error:", error.message);
    }
}, 60 * 1000);

// Run once when the server starts
expireGroupWithdrawals().catch(console.error);
