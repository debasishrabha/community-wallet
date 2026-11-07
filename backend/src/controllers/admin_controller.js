
const prisma = require("../config/prisma");
const csv = require("csv-parser");
const { Readable } = require("stream");

const processBulkCredits = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "CSV file is required",
            });
        }

        const rows = [];

        await new Promise((resolve, reject) => {
            Readable.from(req.file.buffer)
                .pipe(csv())
                .on("data", (row) => rows.push(row))
                .on("end", resolve)
                .on("error", reject);
        });

        const results = [];

        for (const [index, row] of rows.entries()) {
            const mobile = String(row.mobile || "").trim();
            const amountText = String(row.amount || "").trim();
            const reference = String(row.reference || "").trim();

            if (
                !/^\d{10}$/.test(mobile) ||
                !/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(amountText) ||
                !reference
            ) {
                results.push({
                    row: index + 2,
                    success: false,
                    message: "Invalid mobile, amount or reference",
                });
                continue;
            }

            const amount = Number(amountText);

            if (!Number.isFinite(amount) || amount <= 0) {
                results.push({
                    row: index + 2,
                    success: false,
                    message: "Amount must be greater than zero",
                });
                continue;
            }

            try {
                await prisma.$transaction(async (tx) => {
                    const user = await tx.user.findUnique({
                        where: { mobile },
                    });

                    if (!user) {
                        throw new Error("User not found");
                    }

                    const existingEntry = await tx.ledgerEntry.findUnique({
                        where: { reference },
                    });

                    if (existingEntry) {
                        throw new Error("Duplicate reference");
                    }

                    const wallet = await tx.wallet.findUnique({
                        where: { userId: user.id },
                    });

                    if (!wallet) {
                        throw new Error("Wallet not found");
                    }

                    await tx.wallet.update({
                        where: { id: wallet.id },
                        data: {
                            balance: {
                                increment: amount,
                            },
                        },
                    });

                    await tx.ledgerEntry.create({
                        data: {
                            walletId: wallet.id,
                            type: "ADMIN_CREDIT",
                            amount,
                            reference,
                        },
                    });
                });

                results.push({
                    row: index + 2,
                    mobile,
                    success: true,
                    message: "Credit successful",
                });
            } catch (error) {
                results.push({
                    row: index + 2,
                    mobile,
                    success: false,
                    message:
                        error.message === "User not found" ||
                            error.message === "Wallet not found" ||
                            error.message === "Duplicate reference"
                            ? error.message
                            : "Credit failed",
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Bulk credit processing completed",
            totalRows: rows.length,
            successful: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            results,
        });
    } catch (error) {
        console.error("Bulk credit error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to process CSV file",
        });
    }
};

module.exports = { processBulkCredits };
