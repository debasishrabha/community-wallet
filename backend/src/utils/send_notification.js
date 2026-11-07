
const prisma = require("../config/prisma");

async function sendNotification(ledgerEntryId, mobile, message) {
    try {
        const notifyUrl = process.env.NOTIFY_URL;

        if (!notifyUrl) {
            throw new Error("NOTIFY_URL is not configured");
        }

        const response = await fetch(notifyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ mobile, message }),
            signal: AbortSignal.timeout(2000)
        });

        if (!response.ok) {
            throw new Error(`Notification failed: HTTP ${response.status}`);
        }

        await prisma.ledgerEntry.update({
            where: { id: ledgerEntryId },
            data: { notify: "SUCCESS" }
        });

    } catch (error) {
        console.error("Notification failed:", error.message);

        await prisma.ledgerEntry.update({
            where: { id: ledgerEntryId },
            data: { notify: "FAILED" }
        }).catch(dbError => {
            console.error("Notification status update failed:", dbError.message);
        });
    }
}

module.exports = sendNotification;
