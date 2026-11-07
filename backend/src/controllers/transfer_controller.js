
const { transferPoints } = require("../services/transfer_service");

const createTransfer = async (req, res) => {
    try {
        const { receiverMobile, amount } = req.body;
        const idempotencyKey = req.headers["idempotency-key"];

        if (!receiverMobile || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: "Receiver mobile and amount are required"
            });
        }

        if (!idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Idempotency-Key header is required"
            });
        }

        const result = await transferPoints(
            req.user.userId,
            receiverMobile,
            amount,
            idempotencyKey
        );

        return res.status(200).json(result);

    } catch (error) {
        const errors = {
            INVALID_AMOUNT: [400, "Invalid amount"],
            INVALID_RECEIVER: [400, "Invalid receiver mobile"],
            INVALID_IDEMPOTENCY_KEY: [400, "Invalid idempotency key"],
            SENDER_WALLET_NOT_FOUND: [404, "Sender wallet not found"],
            RECEIVER_NOT_FOUND: [404, "Receiver not found"],
            RECEIVER_WALLET_NOT_FOUND: [404, "Receiver wallet not found"],
            SELF_TRANSFER: [400, "Cannot transfer to yourself"],
            INSUFFICIENT_BALANCE: [409, "Insufficient balance"],
            IDEMPOTENCY_KEY_REUSED: [409, "Idempotency key used with different request"],
            TRANSFER_RETRY_EXHAUSTED: [503, "Transfer temporarily unavailable"]
        };

        const [status, message] = errors[error.message] ||
            [500, "Transfer failed"];

        if (status === 500) {
            console.error("Transfer failed:", error.message);
        }

        return res.status(status).json({
            success: false,
            message
        });
    }
};

module.exports = { createTransfer };
