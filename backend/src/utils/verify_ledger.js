
require("dotenv").config();

const prisma = require("../config/prisma");

async function main() {
    const wallets = await prisma.wallet.findMany({
        include: {
            user: true,
            ledgerEntries: true
        }
    });

    console.log("\n--- LEDGER RECONCILIATION ---");

    for (const wallet of wallets) {
        const ledgerBalance = wallet.ledgerEntries.reduce(
            (total, entry) => total.plus(entry.amount),
            new (require("@prisma/client").Prisma.Decimal)(0)
        );

        const currentBalance = wallet.balance;

        const matches = ledgerBalance.equals(currentBalance);

        console.log({
            mobile: wallet.user.mobile,
            walletBalance: currentBalance.toString(),
            ledgerBalance: ledgerBalance.toString(),
            matches
        });
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
