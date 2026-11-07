
const prisma = require("../config/prisma");

async function addGroupMember(req, res) {
    try {
        const groupId = Number(req.params.groupId);
        const leaderId = req.user.userId;
        const { mobile } = req.body;

        // Validate group ID
        if (!Number.isSafeInteger(groupId) || groupId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID"
            });
        }

        // Validate mobile
        if (typeof mobile !== "string" || !/^\d{10}$/.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: "A valid 10-digit mobile number is required"
            });
        }

        // Find group and verify leader
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: { id: true, leaderId: true }
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        if (group.leaderId !== leaderId) {
            return res.status(403).json({
                success: false,
                message: "Only the group leader can add members"
            });
        }

        // Find registered user
        const user = await prisma.user.findUnique({
            where: { mobile }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User is not registered"
            });
        }

        // Add member (unique constraint prevents duplicates)
        const membership = await prisma.groupMember.create({
            data: {
                groupId,
                userId: user.id,
                role: "MEMBER"
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        mobile: true
                    }
                }
            }
        });

        return res.status(201).json({
            success: true,
            message: "Member added successfully",
            member: membership.user
        });

    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "User is already a member of this group"
            });
        }

        console.error("Add group member failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add group member"
        });
    }
}

module.exports = { addGroupMember };
