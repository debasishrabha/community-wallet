
const prisma = require("../config/prisma");

async function expireGroupWithdrawals() {
    const now = new Date();

    try {
        const expiredCount = await prisma.$transaction(async (tx) => {
            const expiredRequests = await tx.groupWithdrawal.findMany({
                where: {
                    status: "PENDING_APPROVAL",
                    expiresAt: { lte: now }
                },
                select: {
                    id: true,
                    amount: true,
                    groupId: true
                }
            });

            let count = 0;

            for (const withdrawal of expiredRequests) {
                const changed = await tx.groupWithdrawal.updateMany({
                    where: {
                        id: withdrawal.id,
                        status: "PENDING_APPROVAL",
                        expiresAt: { lte: now }
                    },
                    data: {
                        status: "EXPIRED"
                    }
                });

                if (changed.count !== 1) {
                    continue;
                }

                const wallet = await tx.groupWallet.findUnique({
                    where: { groupId: withdrawal.groupId }
                });

                if (!wallet) {
                    throw new Error("GROUP_WALLET_NOT_FOUND");
                }

                const released = await tx.groupWallet.updateMany({
                    where: {
                        id: wallet.id,
                        pending: { gte: withdrawal.amount }
                    },
                    data: {
                        pending: { decrement: withdrawal.amount }
                    }
                });

                if (released.count !== 1) {
                    throw new Error("RESERVATION_RELEASE_FAILED");
                }

                count++;
            }

            return count;
        });

        if (expiredCount > 0) {
            console.log(
                `${expiredCount} withdrawal request(s) expired`
            );
        }

        return expiredCount;

    } catch (error) {
        console.error("Withdrawal expiry job failed:", error);
        throw error;
    }
}

module.exports = expireGroupWithdrawals;
