
const prisma = require("../config/prisma");
const jwt = require("jsonwebtoken");

const {
    generateOtp,
    hashOtp,
    verifyOtpHash
} = require("../utils/otp_utils");

// REQUEST OTP
const requestOtp = async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!/^\d{10}$/.test(mobile || "")) {
            return res.status(400).json({
                message: "Invalid mobile number"
            });
        }

        const user = await prisma.user.findUnique({
            where: { mobile }
        });

        if (!user) {
            return res.status(404).json({
                message: "Register first"
            });
        }

        const existing = await prisma.otpVerification.findUnique({
            where: { userId: user.id }
        });

        if (existing?.lockedUntil &&
            existing.lockedUntil > new Date()) {
            return res.status(429).json({
                message: "Account temporarily locked"
            });
        }

        const otp = generateOtp();

        await prisma.otpVerification.upsert({
            where: { userId: user.id },
            update: {
                otpHash: hashOtp(otp),
                attempts: 0,
                lockedUntil: null,
                verifiedAt: null,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            },
            create: {
                userId: user.id,
                otpHash: hashOtp(otp),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            }
        });

        // Development only
        if (process.env.NODE_ENV !== "production") {
            return res.json({
                message: "OTP generated",
                developmentOtp: otp
            });
        }

        return res.json({
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error("OTP request failed:", error.message);

        return res.status(500).json({
            message: "Unable to request OTP"
        });
    }
};


// VERIFY OTP
const verifyOtp = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        if (!/^\d{10}$/.test(mobile || "") ||
            !/^\d{6}$/.test(otp || "")) {
            return res.status(400).json({
                message: "Invalid mobile or OTP"
            });
        }

        const user = await prisma.user.findUnique({
            where: { mobile },
            include: { otp: true }
        });

        if (!user || !user.otp) {
            return res.status(400).json({
                message: "OTP not requested"
            });
        }

        const record = user.otp;
        const now = new Date();

        if (record.lockedUntil && record.lockedUntil > now) {
            return res.status(429).json({
                message: "Account locked. Try again later."
            });
        }

        if (record.expiresAt <= now) {
            return res.status(400).json({
                message: "OTP expired"
            });
        }

        if (!verifyOtpHash(otp, record.otpHash)) {
            const attempts = record.attempts + 1;

            await prisma.otpVerification.update({
                where: { userId: user.id },
                data: {
                    attempts,
                    lockedUntil: attempts >= 5
                        ? new Date(Date.now() + 60 * 1000)
                        : null
                }
            });

            return res.status(401).json({
                message: "Incorrect OTP",
                remainingAttempts: Math.max(0, 5 - attempts)
            });
        }

        await prisma.otpVerification.update({
            where: { userId: user.id },
            data: {
                verifiedAt: now
            }
        });

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                mobile: user.mobile
            }
        });

    } catch (error) {
        console.error("OTP verification failed:", error.message);

        return res.status(500).json({
            message: "Unable to verify OTP"
        });
    }
};

module.exports = {
    requestOtp,
    verifyOtp
};
