const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth_middleware");

const {
    createGroup,
    getGroups,
} = require("../controllers/group_controller");

// Get groups belonging to the authenticated user
router.get("/", authenticate, getGroups);

// Create a group
router.post("/", authenticate, createGroup);

module.exports = router;
