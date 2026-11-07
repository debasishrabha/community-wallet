
const express = require("express");
const multer = require("multer");

const authenticate = require("../middleware/auth_middleware");
const { processBulkCredits } = require("../controllers/admin_controller");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
});

router.post(
    "/credits/bulk",
    authenticate,
    upload.single("file"),
    processBulkCredits
);

module.exports = router;
