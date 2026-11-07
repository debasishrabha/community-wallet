
const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");

// =====================================================
// 1. CREATE WITHDRAWAL REQUEST
// =====================================================

async function requestWithdrawal(req, res) {
    try {
        const groupId = Number(req.params.groupId);
        const userId = req.user.userId;
        const { amount } = req.body;

        if (!Number.isSafeInteger(groupId) || groupId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID"
            });
        }

        if (typeof amount !== "string" && typeof amount !== "number") {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal amount"
            });
        }

        const value = String(amount);

        if (!/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(value)) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal amount"
            });
        }

        const withdrawalAmount = new Prisma.Decimal(value);

        if (withdrawalAmount.lte(0)) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than zero"
            });
        }

        const ttl = Number(process.env.PENDING_TTL_SECONDS || 86400);

        if (!Number.isSafeInteger(ttl) || ttl <= 0) {
            throw new Error("INVALID_PENDING_TTL");
        }

        const result = await prisma.$transaction(async (tx) => {
            const membership = await tx.groupMember.findUnique({
                where: {
                    groupId_userId: { groupId, userId }
                }
            });

            if (!membership) {
                throw new Error("NOT_GROUP_MEMBER");
            }

            const groupWallet = await tx.groupWallet.findUnique({
                where: { groupId }
            });

            if (!groupWallet) {
                throw new Error("GROUP_WALLET_NOT_FOUND");
            }

            const reservation = await tx.$executeRaw`
                UPDATE "GroupWallet"
                SET pending = pending + ${withdrawalAmount.toFixed(2)}::numeric
                WHERE id = ${groupWallet.id}
                AND balance - pending >= ${withdrawalAmount.toFixed(2)}::numeric
            `;

            if (reservation !== 1) {
                throw new Error("INSUFFICIENT_GROUP_BALANCE");
            }

            const withdrawal = await tx.groupWithdrawal.create({
                data: {
                    groupId,
                    requesterId: userId,
                    amount: withdrawalAmount,
                    status: "PENDING_APPROVAL",
                    expiresAt: new Date(Date.now() + ttl * 1000)
                }
            });

            const updatedWallet = await tx.groupWallet.findUnique({
                where: { id: groupWallet.id }
            });

            return {
                withdrawalId: withdrawal.id,
                amount: withdrawal.amount.toFixed(2),
                status: withdrawal.status,
                expiresAt: withdrawal.expiresAt,
                groupBalance: updatedWallet.balance.toFixed(2),
                pending: updatedWallet.pending.toFixed(2),
                available: updatedWallet.balance
                    .minus(updatedWallet.pending)
                    .toFixed(2)
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });

        return res.status(201).json({
            success: true,
            message: "Withdrawal request created successfully",
            withdrawal: result
        });

    } catch (error) {
        const errors = {
            NOT_GROUP_MEMBER: [403, "You are not a member of this group"],
            GROUP_WALLET_NOT_FOUND: [404, "Group wallet not found"],
            INSUFFICIENT_GROUP_BALANCE: [400, "Insufficient available group balance"]
        };

        if (errors[error.message]) {
            const [status, message] = errors[error.message];
            return res.status(status).json({
                success: false,
                message
            });
        }

        console.error("Withdrawal request failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create withdrawal request"
        });
    }
}

// =====================================================
// 2. LEADER APPROVES OR REJECTS WITHDRAWAL
// =====================================================

async function reviewWithdrawal(req, res) {
    try {
        const groupId = Number(req.params.groupId);
        const withdrawalId = Number(req.params.withdrawalId);
        const userId = req.user.userId;
        const { action } = req.body;

        if (
            !Number.isSafeInteger(groupId) || groupId <= 0 ||
            !Number.isSafeInteger(withdrawalId) || withdrawalId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid group or withdrawal ID"
            });
        }

        if (!["APPROVE", "REJECT"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be APPROVE or REJECT"
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const withdrawal = await tx.groupWithdrawal.findFirst({
                where: { id: withdrawalId, groupId },
                include: { group: true }
            });

            if (!withdrawal) {
                throw new Error("WITHDRAWAL_NOT_FOUND");
            }

            if (withdrawal.group.leaderId !== userId) {
                throw new Error("NOT_GROUP_LEADER");
            }


            if (withdrawal.status !== "PENDING_APPROVAL") {
                throw new Error("WITHDRAWAL_ALREADY_REVIEWED");
            }

            const groupWallet = await tx.groupWallet.findUnique({
                where: { groupId }
            });

            if (!groupWallet) {
                throw new Error("GROUP_WALLET_NOT_FOUND");
            }

            const now = new Date();

            // Expired request: release reserved funds.
            if (withdrawal.expiresAt <= now) {
                const changed = await tx.groupWithdrawal.updateMany({
                    where: {
                        id: withdrawalId,
                        status: "PENDING_APPROVAL"
                    },
                    data: { status: "EXPIRED" }
                });

                if (changed.count !== 1) {
                    throw new Error("WITHDRAWAL_ALREADY_REVIEWED");
                }

                const released = await tx.groupWallet.updateMany({
                    where: {
                        id: groupWallet.id,
                        pending: { gte: withdrawal.amount }
                    },
                    data: {
                        pending: { decrement: withdrawal.amount }
                    }
                });

                if (released.count !== 1) {
                    throw new Error("RESERVATION_RELEASE_FAILED");
                }

                return { status: "EXPIRED" };
            }

            // Reject: release the reservation.
            if (action === "REJECT") {
                const changed = await tx.groupWithdrawal.updateMany({
                    where: {
                        id: withdrawalId,
                        status: "PENDING_APPROVAL",
                        expiresAt: { gt: now }
                    },
                    data: {
                        status: "REJECTED",
                        reviewerId: userId,
                        reviewedAt: now
                    }
                });

                if (changed.count !== 1) {
                    throw new Error("WITHDRAWAL_ALREADY_REVIEWED");
                }

                const released = await tx.groupWallet.updateMany({
                    where: {
                        id: groupWallet.id,
                        pending: { gte: withdrawal.amount }
                    },
                    data: {
                        pending: { decrement: withdrawal.amount }
                    }
                });

                if (released.count !== 1) {
                    throw new Error("RESERVATION_RELEASE_FAILED");
                }

                return {
                    status: "REJECTED",
                    amount: withdrawal.amount.toFixed(2)
                };
            }

            // Approve: deduct balance and release reservation.
            const changed = await tx.groupWithdrawal.updateMany({
                where: {
                    id: withdrawalId,
                    status: "PENDING_APPROVAL",
                    expiresAt: { gt: now }
                },
                data: {
                    status: "APPROVED",
                    reviewerId: userId,
                    reviewedAt: now
                }
            });

            if (changed.count !== 1) {
                throw new Error("WITHDRAWAL_ALREADY_REVIEWED");
            }

            const updated = await tx.groupWallet.updateMany({
                where: {
                    id: groupWallet.id,
                    balance: { gte: withdrawal.amount },
                    pending: { gte: withdrawal.amount }
                },
                data: {
                    balance: { decrement: withdrawal.amount },
                    pending: { decrement: withdrawal.amount }
                }
            });

            if (updated.count !== 1) {
                throw new Error("WALLET_UPDATE_FAILED");
            }

            await tx.ledgerEntry.create({
                data: {
                    groupWalletId: groupWallet.id,
                    type: "GROUP_WITHDRAWAL",
                    amount: withdrawal.amount.negated()
                }
            });

            const wallet = await tx.groupWallet.findUnique({
                where: { id: groupWallet.id }
            });

            return {
                status: "APPROVED",
                amount: withdrawal.amount.toFixed(2),
                groupBalance: wallet.balance.toFixed(2),
                pending: wallet.pending.toFixed(2),
                available: wallet.balance.minus(wallet.pending).toFixed(2)
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });

        if (result.status === "EXPIRED") {
            return res.status(410).json({
                success: false,
                message: "Withdrawal expired. Reserved funds released.",
                withdrawal: result
            });
        }

        return res.status(200).json({
            success: true,
            message: `Withdrawal ${result.status.toLowerCase()} successfully`,
            withdrawal: result
        });

    } catch (error) {
        const errors = {
            WITHDRAWAL_NOT_FOUND: [404, "Withdrawal request not found"],
            NOT_GROUP_LEADER: [403, "Only the group leader can review withdrawals"],
            WITHDRAWAL_ALREADY_REVIEWED: [409, "Withdrawal is no longer pending"],
            GROUP_WALLET_NOT_FOUND: [404, "Group wallet not found"],
            RESERVATION_RELEASE_FAILED: [409, "Unable to release reserved funds"],
            WALLET_UPDATE_FAILED: [409, "Unable to update group wallet"]
        };

        if (errors[error.message]) {
            const [status, message] = errors[error.message];

            return res.status(status).json({
                success: false,
                message
            });
        }

        console.error("Withdrawal review failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to review withdrawal"
        });
    }
}

async function getGroupWallet(req, res) {
    try {
        const groupId = Number(req.params.groupId);
        const userId = req.user.userId;

        if (!Number.isSafeInteger(groupId) || groupId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID"
            });
        }

        const result = await prisma.$transaction(async (tx) => {

            // 1. Check group membership
            const membership = await tx.groupMember.findUnique({
                where: {
                    groupId_userId: { groupId, userId }
                }
            });

            if (!membership) {
                throw new Error("NOT_GROUP_MEMBER");
            }

            // 2. Find expired pending withdrawals
            const now = new Date();

            const expiredWithdrawals =
                await tx.groupWithdrawal.findMany({
                    where: {
                        groupId,
                        status: "PENDING_APPROVAL",
                        expiresAt: { lte: now }
                    }
                });

            // 3. Mark each expired request and release reserved funds
            for (const withdrawal of expiredWithdrawals) {

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

                if (changed.count === 0) continue;

                const wallet = await tx.groupWallet.findUnique({
                    where: { groupId }
                });

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
            }

            // 4. Fetch updated group wallet
            const wallet = await tx.groupWallet.findUnique({
                where: { groupId }
            });

            if (!wallet) {
                throw new Error("GROUP_WALLET_NOT_FOUND");
            }

            return {
                balance: wallet.balance.toFixed(2),
                pending: wallet.pending.toFixed(2),
                available: wallet.balance
                    .minus(wallet.pending)
                    .toFixed(2)
            };

        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });

        return res.status(200).json({
            success: true,
            wallet: result
        });

    } catch (error) {
        if (error.message === "NOT_GROUP_MEMBER") {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this group"
            });
        }

        if (error.message === "GROUP_WALLET_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Group wallet not found"
            });
        }

        console.error("Get group wallet failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch group wallet"
        });
    }
}

module.exports = {
    requestWithdrawal,
    reviewWithdrawal,
    getGroupWallet
};
