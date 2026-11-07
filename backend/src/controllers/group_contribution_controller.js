
const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");

function validateContributionAmount(amount) {
    if (
        typeof amount !== "string" &&
        typeof amount !== "number"
    ) {
        throw new Error("INVALID_AMOUNT");
    }

    const value = String(amount);

    if (!/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(value)) {
        throw new Error("INVALID_AMOUNT");
    }

    const decimal = new Prisma.Decimal(value);

    if (decimal.lte(0)) {
        throw new Error("INVALID_AMOUNT");
    }

    return decimal.toFixed(2);
}

async function contributeToGroup(req, res) {
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

        const normalizedAmount = validateContributionAmount(amount);

        const result = await prisma.$transaction(async (tx) => {
            // Check group membership
            const membership = await tx.groupMember.findUnique({
                where: {
                    groupId_userId: {
                        groupId,
                        userId
                    }
                }
            });

            if (!membership) {
                throw new Error("NOT_GROUP_MEMBER");
            }

            // Find personal wallet
            const personalWallet = await tx.wallet.findUnique({
                where: { userId }
            });

            if (!personalWallet) {
                throw new Error("PERSONAL_WALLET_NOT_FOUND");
            }

            // Find group wallet
            const groupWallet = await tx.groupWallet.findUnique({
                where: { groupId }
            });

            if (!groupWallet) {
                throw new Error("GROUP_WALLET_NOT_FOUND");
            }

            // Atomically debit personal wallet
            const debit = await tx.$executeRaw`
                UPDATE "Wallet"
                SET balance = balance - ${normalizedAmount}::numeric
                WHERE id = ${personalWallet.id}
                AND balance >= ${normalizedAmount}::numeric
            `;

            if (debit !== 1) {
                throw new Error("INSUFFICIENT_BALANCE");
            }

            // Credit group wallet
            const credit = await tx.$executeRaw`
                UPDATE "GroupWallet"
                SET balance = balance + ${normalizedAmount}::numeric
                WHERE id = ${groupWallet.id}
            `;

            if (credit !== 1) {
                throw new Error("GROUP_WALLET_NOT_FOUND");
            }

            // Record both sides in the ledger
            await tx.ledgerEntry.createMany({
                data: [
                    {
                        walletId: personalWallet.id,
                        type: "GROUP_CONTRIBUTION",
                        amount: new Prisma.Decimal(normalizedAmount).negated()
                    },
                    {
                        groupWalletId: groupWallet.id,
                        type: "GROUP_CONTRIBUTION",
                        amount: new Prisma.Decimal(normalizedAmount)
                    }
                ]
            });

            const updatedGroupWallet = await tx.groupWallet.findUnique({
                where: { id: groupWallet.id }
            });

            return {
                personalWalletId: personalWallet.id,
                groupWalletId: groupWallet.id,
                amount: normalizedAmount,
                groupBalance: updatedGroupWallet.balance.toFixed(2),
                groupPending: updatedGroupWallet.pending.toFixed(2),
                groupAvailable: updatedGroupWallet.balance
                    .minus(updatedGroupWallet.pending)
                    .toFixed(2)
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });

        return res.status(200).json({
            success: true,
            message: "Group contribution successful",
            contribution: result
        });

    } catch (error) {
        const errors = {
            INVALID_AMOUNT: [400, "Invalid contribution amount"],
            NOT_GROUP_MEMBER: [403, "You are not a member of this group"],
            PERSONAL_WALLET_NOT_FOUND: [404, "Personal wallet not found"],
            GROUP_WALLET_NOT_FOUND: [404, "Group wallet not found"],
            INSUFFICIENT_BALANCE: [400, "Insufficient personal wallet balance"]
        };

        if (errors[error.message]) {
            const [status, message] = errors[error.message];

            return res.status(status).json({
                success: false,
                message
            });
        }

        console.error("Group contribution failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to process group contribution"
        });
    }
}

module.exports = { contributeToGroup };
