
require("dotenv").config();

const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");

async function fundWallet(mobile, amount) {
    return prisma.$transaction(async (tx) => {

        // Find user and wallet
        const user = await tx.user.findUnique({
            where: { mobile },
            include: { wallet: true }
        });

        if (!user) {
            throw new Error(`User not found: ${mobile}`);
        }

        if (!user.wallet) {
            throw new Error(`Wallet not found: ${mobile}`);
        }

        const creditAmount = new Prisma.Decimal(amount);

        // Atomically fund only an empty wallet
        const updated = await tx.wallet.updateMany({
            where: {
                id: user.wallet.id,
                balance: new Prisma.Decimal("0.00")
            },
            data: {
                balance: {
                    increment: creditAmount
                }
            }
        });

        if (updated.count !== 1) {
            throw new Error(
                `Wallet already funded or balance changed: ${mobile}`
            );
        }

        // Append-only ledger entry
        await tx.ledgerEntry.create({
            data: {
                walletId: user.wallet.id,
                type: "ADMIN_CREDIT",
                amount: creditAmount
            }
        });

        return {
            mobile,
            amount: creditAmount.toFixed(2)
        };
    });
}

async function main() {

    // Safety check
    if (process.env.NODE_ENV === "production") {
        throw new Error("Test funding disabled in production");
    }

    console.log("Starting test wallet funding...");

    // Fund Debasish
    const first = await fundWallet(
        "9000000001",
        "100.00"
    );

    console.log("First wallet funded:", first);

    // Fund Rahul
    const second = await fundWallet(
        "9000000002",
        "100.00"
    );

    console.log("Second wallet funded:", second);

    console.log("\nBoth test wallets funded successfully!");
}

main()
    .catch((error) => {
        console.error("\nFunding failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
