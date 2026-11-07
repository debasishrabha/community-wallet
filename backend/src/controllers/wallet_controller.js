
const prisma = require("../config/prisma");

const getWallet = async (req, res) => {
    try {
        const userId = req.user.userId;

        const wallet = await prisma.wallet.findUnique({
            where: { userId }
        });

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            });
        }

        const balance = wallet.balance;

        // Group withdrawal pending amount will be implemented later.
        const pending = "0.00";

        const available = balance.toDecimalPlaces(2);

        return res.status(200).json({
            success: true,
            wallet: {
                balance: balance.toFixed(2),
                pending,
                available: available.toFixed(2)
            }
        });

    } catch (error) {
        console.error("Wallet fetch failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch wallet"
        });
    }
};

module.exports = { getWallet };
