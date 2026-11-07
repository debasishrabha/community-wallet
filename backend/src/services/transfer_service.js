
const { Prisma } = require("@prisma/client");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const sendNotification = require("../utils/send_notification");

const MAX_RETRIES = 10;

function validateAmount(amount) {
    if (typeof amount !== "string" && typeof amount !== "number") {
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

function isSerializationConflict(error) {
    return (
        error.code === "P2034" ||
        error.code === "40001" ||
        error.meta?.code === "40001" ||
        error.message?.includes("40001") ||
        error.message?.toLowerCase().includes("could not serialize")
    );
}

function delay(attempt) {
    const exponentialDelay = Math.min(25 * Math.pow(2, attempt), 500);
    const jitter = Math.floor(Math.random() * 50);

    return new Promise(resolve =>
        setTimeout(resolve, exponentialDelay + jitter)
    );
}

async function transferPoints(senderId, receiverMobile, amount, idempotencyKey) {
    const normalizedAmount = validateAmount(amount);

    if (!/^\d{10}$/.test(receiverMobile || "")) {
        throw new Error("INVALID_RECEIVER");
    }

    if (
        typeof idempotencyKey !== "string" ||
        idempotencyKey.length < 1 ||
        idempotencyKey.length > 128
    ) {
        throw new Error("INVALID_IDEMPOTENCY_KEY");
    }

    const requestHash = crypto
        .createHash("sha256")
        .update(JSON.stringify({
            receiverMobile,
            amount: normalizedAmount
        }))
        .digest("hex");

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const sender = await tx.user.findUnique({
                    where: { id: senderId },
                    include: { wallet: true }
                });

                if (!sender || !sender.wallet) {
                    throw new Error("SENDER_WALLET_NOT_FOUND");
                }

                const receiver = await tx.user.findUnique({
                    where: { mobile: receiverMobile },
                    include: { wallet: true }
                });

                if (!receiver || !receiver.wallet) {
                    throw new Error("RECEIVER_NOT_FOUND");
                }

                if (sender.id === receiver.id) {
                    throw new Error("SELF_TRANSFER");
                }

                const transfer = await tx.transfer.create({
                    data: {
                        senderId,
                        receiverId: receiver.id,
                        amount: normalizedAmount,
                        idempotencyKey,
                        requestHash
                    }
                });

                const debit = await tx.$executeRaw`
                    UPDATE "Wallet"
                    SET balance = balance - ${normalizedAmount}::numeric
                    WHERE id = ${sender.wallet.id}
                    AND balance >= ${normalizedAmount}::numeric
                `;

                if (debit !== 1) {
                    throw new Error("INSUFFICIENT_BALANCE");
                }

                const credit = await tx.$executeRaw`
                    UPDATE "Wallet"
                    SET balance = balance + ${normalizedAmount}::numeric
                    WHERE id = ${receiver.wallet.id}
                `;

                if (credit !== 1) {
                    throw new Error("RECEIVER_WALLET_NOT_FOUND");
                }

                const senderLedger = await tx.ledgerEntry.create({
                    data: {
                        walletId: sender.wallet.id,
                        transferId: transfer.id,
                        type: "TRANSFER_OUT",
                        amount: new Prisma.Decimal(normalizedAmount).negated()
                    }
                });

                const receiverLedger = await tx.ledgerEntry.create({
                    data: {
                        walletId: receiver.wallet.id,
                        transferId: transfer.id,
                        type: "TRANSFER_IN",
                        amount: new Prisma.Decimal(normalizedAmount)
                    }
                });

                return {
                    success: true,
                    message: "Transfer successful",
                    transferId: transfer.id,
                    amount: normalizedAmount,
                    senderLedgerId: senderLedger.id,
                    receiverLedgerId: receiverLedger.id,
                    senderMobile: sender.mobile,
                    receiverMobile: receiver.mobile
                };
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 10000,
                timeout: 15000
            });

            // Notifications happen AFTER the transaction commits.
            // They do not delay the transfer response.
            void sendNotification(
                result.senderLedgerId,
                result.senderMobile,
                `You sent ₹${normalizedAmount} to ${result.receiverMobile}.`
            ).catch(error => {
                console.error("Sender notification error:", error.message);
            });

            void sendNotification(
                result.receiverLedgerId,
                result.receiverMobile,
                `You received ₹${normalizedAmount} from ${result.senderMobile}.`
            ).catch(error => {
                console.error("Receiver notification error:", error.message);
            });

            return {
                success: true,
                message: result.message,
                transferId: result.transferId,
                amount: result.amount
            };

        } catch (error) {
            if (error.code === "P2002") {
                const existing = await prisma.transfer.findUnique({
                    where: {
                        senderId_idempotencyKey: {
                            senderId,
                            idempotencyKey
                        }
                    }
                });

                if (!existing) {
                    throw new Error("TRANSFER_CONFLICT");
                }

                if (existing.requestHash !== requestHash) {
                    throw new Error("IDEMPOTENCY_KEY_REUSED");
                }

                return {
                    success: true,
                    message: "Original transfer result",
                    transferId: existing.id,
                    amount: existing.amount.toString(),
                    duplicate: true
                };
            }

            if (isSerializationConflict(error)) {
                if (attempt < MAX_RETRIES - 1) {
                    await delay(attempt);
                    continue;
                }

                throw new Error("TRANSFER_RETRY_EXHAUSTED");
            }

            throw error;
        }
    }

    throw new Error("TRANSFER_RETRY_EXHAUSTED");
}

module.exports = {
    transferPoints,
    validateAmount
};
