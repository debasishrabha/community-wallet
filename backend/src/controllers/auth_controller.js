
const prisma = require("../config/prisma");

const register = async (req, res) => {
    try {
        const { fullName, mobile } = req.body;

        // Basic validation
        if (!fullName || !mobile) {
            return res.status(400).json({
                success: false,
                message: "Name and mobile are required"
            });
        }

        if (fullName.trim().length < 2 ||
            fullName.trim().length > 60) {
            return res.status(400).json({
                success: false,
                message: "Name must be 2-60 characters"
            });
        }

        if (!/^\d{10}$/.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: "Mobile must contain exactly 10 digits"
            });
        }

        // Check existing user
        const existingUser = await prisma.user.findUnique({
            where: { mobile }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Mobile number already registered"
            });
        }

        // Create user and wallet atomically
        const user = await prisma.user.create({
            data: {
                fullName: fullName.trim(),
                mobile,
                wallet: {
                    create: {
                        balance: 0
                    }
                }
            },
            include: {
                wallet: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user.id,
                fullName: user.fullName,
                mobile: user.mobile
            },
            wallet: {
                balance: user.wallet.balance.toString()
            }
        });

    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "Mobile number already registered"
            });
        }

        console.error("Registration failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = { register };
