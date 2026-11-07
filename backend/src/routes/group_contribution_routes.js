
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth_middleware");

const {
    contributeToGroup
} = require("../controllers/group_contribution_controller");

router.post(
    "/:groupId/contributions",
    authenticate,
    contributeToGroup
);

module.exports = router;
