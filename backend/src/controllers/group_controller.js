const prisma = require("../config/prisma");

async function createGroup(req, res) {
    try {
        const { name } = req.body;
        const userId = req.user.userId;

        if (
            typeof name !== "string" ||
            name.trim().length < 2 ||
            name.trim().length > 80
        ) {
            return res.status(400).json({
                success: false,
                message: "Group name must be between 2 and 80 characters"
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const group = await prisma.$transaction(async (tx) => {
            return tx.group.create({
                data: {
                    name: name.trim(),
                    creator: {
                        connect: { id: userId }
                    },
                    leader: {
                        connect: { id: userId }
                    },
                    members: {
                        create: {
                            user: {
                                connect: { id: userId }
                            },
                            role: "LEADER"
                        }
                    },
                    wallet: {
                        create: {
                            balance: "0.00",
                            pending: "0.00"
                        }
                    }
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            fullName: true,
                            mobile: true
                        }
                    },
                    leader: {
                        select: {
                            id: true,
                            fullName: true,
                            mobile: true
                        }
                    },
                    members: true,
                    wallet: true
                }
            });
        });

        return res.status(201).json({
            success: true,
            message: "Group created successfully",
            group: {
                id: group.id,
                name: group.name,
                creator: group.creator,
                leader: group.leader,
                memberCount: group.members.length,
                wallet: {
                    balance: group.wallet.balance.toFixed(2),
                    pending: group.wallet.pending.toFixed(2),
                    available: group.wallet.balance
                        .minus(group.wallet.pending)
                        .toFixed(2)
                },
                createdAt: group.createdAt
            }
        });

    } catch (error) {
        console.error("Create group failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create group"
        });
    }
}

// Get all groups where the authenticated user is a member
async function getGroups(req, res) {
    try {
        const userId = req.user.userId;

        const groups = await prisma.group.findMany({
            where: {
                members: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                leader: {
                    select: {
                        id: true,
                        fullName: true,
                        mobile: true
                    }
                },
                wallet: true,
                members: {
                    select: {
                        userId: true,
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            success: true,
            groups: groups.map((group) => ({
                id: group.id,
                name: group.name,
                leader: group.leader,
                memberCount: group.members.length,
                wallet: {
                    balance: group.wallet.balance.toFixed(2),
                    pending: group.wallet.pending.toFixed(2),
                    available: group.wallet.balance
                        .minus(group.wallet.pending)
                        .toFixed(2)
                },
                members: group.members,
                createdAt: group.createdAt
            }))
        });

    } catch (error) {
        console.error("Get groups failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load groups"
        });
    }
}

module.exports = {
    createGroup,
    getGroups
};
