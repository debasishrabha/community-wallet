
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth_middleware");
const {
    addGroupMember
} = require("../controllers/group_member_controller");

router.post("/:groupId/members", authenticate, addGroupMember);

module.exports = router;
