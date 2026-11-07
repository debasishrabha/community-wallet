
const prisma = require("../config/prisma");

const getTransactions = async (req, res) => {
    try {
        const userId = req.user.userId;

        const page = Math.max(
            1,
            parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            50,
            Math.max(1, parseInt(req.query.limit, 10) || 10)
        );

        const skip = (page - 1) * limit;

        const where = {
            OR: [
                { senderId: userId },
                { receiverId: userId }
            ]
        };

        const [transactions, total] = await Promise.all([
            prisma.transfer.findMany({
                where,
                include: {
                    sender: {
                        select: {
                            id: true,
                            fullName: true,
                            mobile: true
                        }
                    },
                    receiver: {
                        select: {
                            id: true,
                            fullName: true,
                            mobile: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip,
                take: limit
            }),

            prisma.transfer.count({ where })
        ]);

        const formattedTransactions = transactions.map((tx) => ({
            id: tx.id,
            type: tx.senderId === userId
                ? "TRANSFER_OUT"
                : "TRANSFER_IN",
            amount: tx.amount.toFixed(2),
            sender: tx.sender,
            receiver: tx.receiver,
            createdAt: tx.createdAt
        }));

        return res.status(200).json({
            success: true,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            transactions: formattedTransactions
        });

    } catch (error) {
        console.error("Transaction history failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch transactions"
        });
    }
};

module.exports = { getTransactions };
