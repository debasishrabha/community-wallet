require("dotenv").config();

const prisma = require("../config/prisma");
const { transferPoints } = require("../services/transfer_service");

async function main() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Concurrency test disabled in production");
    }

    const sender = await prisma.user.findUnique({
        where: { mobile: "9000000001" }
    });

    if (!sender) {
        throw new Error("Sender not found");
    }

    const receiverMobile = "9000000002";
    const requests = 20;
    const testId = `concurrency-${Date.now()}`;

    console.log("Starting concurrent transfer test...");
    console.log(`Sender: ${sender.mobile}`);
    console.log(`Requests: ${requests}`);
    console.log("Amount per request: ₹10");

    const results = await Promise.allSettled(
        Array.from({ length: requests }, (_, index) =>
            transferPoints(
                sender.id,
                receiverMobile,
                "10.00",
                `${testId}-${index + 1}`
            )
        )
    );

    const successful = results.filter(
        result => result.status === "fulfilled"
    );

    const failed = results.filter(
        result => result.status === "rejected"
    );

    console.log("\n--- TEST RESULTS ---");
    console.log("Successful:", successful.length);
    console.log("Failed:", failed.length);

    failed.forEach((result, index) => {
        console.log(`Failure ${index + 1}:`, result.reason.message);
    });

    const wallets = await prisma.wallet.findMany({
        where: {
            userId: { in: [sender.id] }
        },
        include: { user: true }
    });

    console.log("\nFinal sender balance:");
    wallets.forEach(wallet => {
        console.log(wallet.user.mobile, wallet.balance.toString());
    });
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
