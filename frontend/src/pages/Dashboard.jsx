
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Dashboard.css";

function Dashboard() {
    const navigate = useNavigate();

    // Wallet state
    const [wallet, setWallet] = useState({
        balance: 0,
        pending: 0,
        available: 0,
    });

    // Transaction state
    const [transactions, setTransactions] = useState([]);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [loading, setLoading] = useState(true);

    // Error state
    const [error, setError] = useState("");

    // Transfer state
    const [receiverMobile, setReceiverMobile] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferMessage, setTransferMessage] = useState("");
    const [transferError, setTransferError] = useState("");

    const PAGE_SIZE = 5;

    // Format currency
    const formatAmount = (amount) =>
        Number(amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    // Fetch wallet and transaction history
    const fetchDashboard = async (requestedPage = page) => {
        try {
            setLoading(true);
            setError("");

            const [walletResponse, transactionResponse] =
                await Promise.all([
                    api.get("/wallet"),
                    api.get(
                        `/transactions?page=${requestedPage}&limit=${PAGE_SIZE}`
                    ),
                ]);

            const walletData =
                walletResponse.data.wallet || walletResponse.data;

            setWallet({
                balance: Number(walletData.balance || 0),
                pending: Number(walletData.pending || 0),
                available: Number(walletData.available || 0),
            });

            const transactionData = transactionResponse.data;

            const transactionList =
                transactionData.transactions ||
                transactionData.data ||
                [];

            const safeTransactions = Array.isArray(transactionList)
                ? transactionList
                : [];

            setTransactions(safeTransactions);

            // Determine whether another page exists.
            if (typeof transactionData.hasNextPage === "boolean") {
                setHasNextPage(transactionData.hasNextPage);
            } else if (typeof transactionData.totalPages === "number") {
                setHasNextPage(requestedPage < transactionData.totalPages);
            } else if (typeof transactionData.total === "number") {
                setHasNextPage(requestedPage * PAGE_SIZE < transactionData.total);
            } else {
                setHasNextPage(safeTransactions.length === PAGE_SIZE);
            }

        } catch (err) {
            console.error("Dashboard error:", err);

            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
                return;
            }

            setError(
                err.response?.data?.message ||
                "Unable to load wallet information."
            );
        } finally {
            setLoading(false);
        }
    };

    // Load dashboard on mount
    useEffect(() => {
        if (!localStorage.getItem("token")) {
            navigate("/login");
            return;
        }

        fetchDashboard(1);
    }, []);

    // Transfer points
    const handleTransfer = async (e) => {
        e.preventDefault();

        setTransferMessage("");
        setTransferError("");

        if (!/^[0-9]{10}$/.test(receiverMobile)) {
            setTransferError(
                "Enter a valid 10-digit receiver mobile number."
            );
            return;
        }

        if (
            !/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(transferAmount) ||
            Number(transferAmount) <= 0
        ) {
            setTransferError("Enter a valid positive amount.");
            return;
        }

        if (Number(transferAmount) > wallet.available) {
            setTransferError("Insufficient available balance.");
            return;
        }

        try {
            setTransferLoading(true);

            const idempotencyKey = crypto.randomUUID();

            await api.post(
                "/transfers",
                {
                    receiverMobile,
                    amount: transferAmount,
                },
                {
                    headers: {
                        "Idempotency-Key": idempotencyKey,
                    },
                }
            );

            setTransferMessage("Points transferred successfully!");

            setReceiverMobile("");
            setTransferAmount("");

            // Refresh wallet and transaction history.
            setPage(1);
            await fetchDashboard(1);

        } catch (err) {
            console.error("Transfer error:", err);

            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
                return;
            }

            setTransferError(
                err.response?.data?.message ||
                "Transfer failed. Please try again."
            );
        } finally {
            setTransferLoading(false);
        }
    };

    // Pagination
    const handlePrevious = async () => {
        if (page <= 1 || loading) return;

        const previousPage = page - 1;
        setPage(previousPage);
        await fetchDashboard(previousPage);
    };

    const handleNext = async () => {
        if (!hasNextPage || loading) return;

        const nextPage = page + 1;
        setPage(nextPage);
        await fetchDashboard(nextPage);
    };

    // Logout
    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
    };

    return (
        <div className="dashboard-page">

            {/* Header */}
            <header className="dashboard-header">
                <div className="dashboard-brand">
                    <div className="dashboard-logo">CP</div>
                    <span>Community Wallet</span>
                </div>

                <button
                    className="logout-button"
                    onClick={handleLogout}
                >
                    Logout
                </button>
                <button
                    className="refresh-button"
                    onClick={() => navigate("/groups")}
                >
                    Group Wallets
                </button>
            </header>

            <main className="dashboard-container">

                {/* Welcome section */}
                <section className="dashboard-welcome">
                    <div>
                        <p className="dashboard-label">MY WALLET</p>
                        <h1>Welcome back!</h1>
                        <p>
                            Here's an overview of your community points.
                        </p>
                    </div>

                    <button
                        className="refresh-button"
                        onClick={() => fetchDashboard(page)}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                </section>

                {error && (
                    <div className="dashboard-error">
                        {error}
                    </div>
                )}

                {/* Wallet cards */}
                <section className="wallet-cards">

                    <div className="wallet-card total-card">
                        <p>Total Balance</p>
                        <h2>
                            {loading
                                ? "..."
                                : `₹${formatAmount(wallet.balance)}`}
                        </h2>
                        <span>Your wallet balance</span>
                    </div>

                    <div className="wallet-card available-card">
                        <p>Available Points</p>
                        <h2>
                            {loading
                                ? "..."
                                : `₹${formatAmount(wallet.available)}`}
                        </h2>
                        <span>Ready to use</span>
                    </div>

                    <div className="wallet-card pending-card">
                        <p>Pending Points</p>
                        <h2>
                            {loading
                                ? "..."
                                : `₹${formatAmount(wallet.pending)}`}
                        </h2>
                        <span>Currently reserved</span>
                    </div>

                </section>

                {/* Transfer section */}
                <section className="transfer-section">
                    <h2>Transfer Points</h2>
                    <p>Send points to another community member.</p>

                    <form onSubmit={handleTransfer}>

                        <div className="transfer-fields">

                            <div>
                                <label htmlFor="receiver-mobile">
                                    Receiver Mobile Number
                                </label>

                                <input
                                    id="receiver-mobile"
                                    type="tel"
                                    placeholder="10-digit mobile number"
                                    value={receiverMobile}
                                    onChange={(e) =>
                                        setReceiverMobile(e.target.value)
                                    }
                                    maxLength={10}
                                    required
                                    disabled={transferLoading}
                                />
                            </div>

                            <div>
                                <label htmlFor="transfer-amount">
                                    Amount (₹)
                                </label>

                                <input
                                    id="transfer-amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="Enter amount"
                                    value={transferAmount}
                                    onChange={(e) =>
                                        setTransferAmount(e.target.value)
                                    }
                                    required
                                    disabled={transferLoading}
                                />
                            </div>

                        </div>

                        <button
                            type="submit"
                            className="transfer-button"
                            disabled={transferLoading}
                        >
                            {transferLoading
                                ? "Processing..."
                                : "Transfer Points"}
                        </button>

                        {transferMessage && (
                            <p className="transfer-success">
                                {transferMessage}
                            </p>
                        )}

                        {transferError && (
                            <p className="transfer-error">
                                {transferError}
                            </p>
                        )}

                    </form>
                </section>

                {/* Transaction history */}
                <section className="transactions-section">

                    <div className="section-heading">
                        <div>
                            <h2>Recent Transactions</h2>
                            <p>Your latest wallet activity</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="empty-state">
                            Loading transactions...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="empty-state">
                            No transactions found yet.
                        </div>
                    ) : (
                        <div className="transaction-list">

                            {transactions.map((transaction, index) => {
                                const amount = Number(
                                    transaction.amount || 0
                                );

                                return (
                                    <div
                                        className="transaction-item"
                                        key={transaction.id || index}
                                    >
                                        <div className="transaction-info">

                                            <div className="transaction-icon">
                                                {amount >= 0 ? "+" : "−"}
                                            </div>

                                            <div>
                                                <h3>
                                                    {transaction.type ||
                                                        "Transaction"}
                                                </h3>

                                                <p>
                                                    {transaction.createdAt
                                                        ? new Date(
                                                            transaction.createdAt
                                                        ).toLocaleString()
                                                        : "Date unavailable"}
                                                </p>
                                            </div>

                                        </div>

                                        <strong
                                            className={
                                                amount >= 0
                                                    ? "amount-positive"
                                                    : "amount-negative"
                                            }
                                        >
                                            {amount >= 0 ? "+" : "−"}
                                            ₹{formatAmount(Math.abs(amount))}
                                        </strong>

                                    </div>
                                );
                            })}

                        </div>
                    )}

                    {/* Pagination */}
                    <div className="pagination">
                        <button
                            onClick={handlePrevious}
                            disabled={page === 1 || loading}
                        >
                            Previous
                        </button>

                        <span>Page {page}</span>

                        <button
                            onClick={handleNext}
                            disabled={!hasNextPage || loading}
                        >
                            Next
                        </button>
                    </div>

                </section>

            </main>
        </div>
    );
}

export default Dashboard;
