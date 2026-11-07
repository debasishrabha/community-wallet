
import { useState } from "react";
import api from "../services/api";
import "./Login.css";

function Login() {
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const requestOtp = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!/^[0-9]{10}$/.test(mobile)) {
            setError("Enter a valid 10-digit mobile number.");
            return;
        }

        try {
            setLoading(true);

            await api.post("/auth/otp/request", { mobile });

            setOtpSent(true);
            setMessage("OTP sent successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to send OTP.");
        } finally {
            setLoading(false);
        }
    };


    const verifyOtp = async (e) => {
        e.preventDefault();

        console.log("1. Verify button clicked");
        console.log("2. Mobile:", mobile);

        setError("");
        setLoading(true);

        try {
            console.log("3. Sending verification request...");

            const response = await api.post("/auth/otp/verify", {
                mobile,
                otp,
            });

            console.log("4. Backend response:", response.data);

            const token = response.data.token || response.data.accessToken;

            if (!token) {
                throw new Error("JWT token missing in backend response");
            }

            localStorage.setItem("token", token);

            console.log(
                "5. JWT stored:",
                Boolean(localStorage.getItem("token"))
            );

            window.location.href = "/dashboard";

        } catch (err) {
            console.error("LOGIN ERROR:", err);

            setError(
                err.response?.data?.message ||
                err.message ||
                "OTP verification failed."
            );
        } finally {
            setLoading(false);
        }
    };


    return (
        <main className="login-page">
            <section className="login-card">
                <div className="brand-icon">CP</div>

                <p className="brand-name">COMMUNITY WALLET</p>

                <h1>Welcome back</h1>

                <p className="login-subtitle">
                    Manage your community points securely.
                </p>

                {!otpSent ? (
                    <form onSubmit={requestOtp}>
                        <label htmlFor="mobile">Mobile number</label>

                        <input
                            id="login-mobile"
                            type="tel"
                            placeholder="Enter 10-digit mobile number"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            maxLength={10}
                            required
                        />

                        <button id="login-submit" disabled={loading}>
                            {loading ? "Sending..." : "Get OTP"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={verifyOtp}>
                        <label htmlFor="otp">Enter OTP</label>

                        <input
                            id="login-otp"
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={6}
                            required
                        />

                        <button id="login-submit" disabled={loading}>
                            {loading ? "Verifying..." : "Verify & Login"}
                        </button>

                        <button
                            type="button"
                            className="back-button"
                            onClick={() => {
                                setOtpSent(false);
                                setOtp("");
                                setMessage("");
                                setError("");
                            }}
                        >
                            Change mobile number
                        </button>
                    </form>
                )}

                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}

                <p className="login-footer">
                    Secure access to your community wallet.
                </p>
            </section>
        </main>
    );
}

export default Login;
