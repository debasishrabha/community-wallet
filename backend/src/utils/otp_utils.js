
const crypto = require("crypto");

// Generate 6-digit OTP
function generateOtp() {
    if (process.env.OTP_FIXED) {
        return process.env.OTP_FIXED;
    }

    return crypto.randomInt(100000, 1000000).toString();
}

// Hash OTP before storing in database
function hashOtp(otp) {
    return crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
}

// Compare OTP securely
function verifyOtpHash(otp, storedHash) {
    const supplied = Buffer.from(hashOtp(otp), "hex");
    const stored = Buffer.from(storedHash, "hex");

    return supplied.length === stored.length &&
        crypto.timingSafeEqual(supplied, stored);
}

module.exports = {
    generateOtp,
    hashOtp,
    verifyOtpHash
};
