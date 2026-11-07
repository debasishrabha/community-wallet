
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./GroupWallet.css";

function GroupWallet() {
    const navigate = useNavigate();

    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState("");
    const [groupWallet, setGroupWallet] = useState({
        balance: 0,
        pending: 0,
        available: 0,
    });

    const [groupName, setGroupName] = useState("");
    const [memberMobile, setMemberMobile] = useState("");
    const [contributionAmount, setContributionAmount] = useState("");
    const [withdrawalAmount, setWithdrawalAmount] = useState("");
    const [withdrawalId, setWithdrawalId] = useState("");

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const formatAmount = (amount) =>
        Number(amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const handleError = (err, fallback) => {
        console.error(fallback, err);

        if (err.response?.status === 401) {
            localStorage.removeItem("token");
            navigate("/login");
            return;
        }

        setError(err.response?.data?.message || fallback);
    };

    // Load groups
    const fetchGroups = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/groups");

            const data = response.data;
            const groupList = Array.isArray(data)
                ? data
                : data.groups || data.data || [];

            setGroups(groupList);

            if (groupList.length > 0) {
                const stillExists = groupList.some(
                    (group) => String(group.id) === String(selectedGroup)
                );

                if (!selectedGroup || !stillExists) {
                    setSelectedGroup(String(groupList[0].id));
                }
            } else {
                setSelectedGroup("");
                setGroupWallet({
                    balance: 0,
                    pending: 0,
                    available: 0,
                });
            }
        } catch (err) {
            handleError(err, "Unable to load groups.");
        } finally {
            setLoading(false);
        }
    };

    // Load selected group wallet
    const fetchGroupWallet = async (groupId = selectedGroup) => {
        if (!groupId) return;

        try {
            setLoading(true);
            setError("");

            const response = await api.get(`/groups/${groupId}/wallet`);

            const data = response.data.wallet || response.data;

            setGroupWallet({
                balance: Number(data.balance || 0),
                pending: Number(data.pending || 0),
                available: Number(
                    data.available ??
                    (Number(data.balance || 0) - Number(data.pending || 0))
                ),
            });
        } catch (err) {
            handleError(err, "Unable to load group wallet.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!localStorage.getItem("token")) {
            navigate("/login");
            return;
        }

        fetchGroups();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchGroupWallet(selectedGroup);
        }
    }, [selectedGroup]);

    // Create group
    const handleCreateGroup = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (!groupName.trim()) {
            setError("Enter a group name.");
            return;
        }

        try {
            setActionLoading(true);

            const response = await api.post("/groups", {
                name: groupName.trim(),
            });

            const createdGroup =
                response.data.group || response.data;

            setGroupName("");
            setMessage("Group created successfully!");

            await fetchGroups();

            if (createdGroup.id) {
                setSelectedGroup(String(createdGroup.id));
            }
        } catch (err) {
            handleError(err, "Unable to create group.");
        } finally {
            setActionLoading(false);
        }
    };

    // Add member
    const handleAddMember = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (!/^[0-9]{10}$/.test(memberMobile)) {
            setError("Enter a valid 10-digit mobile number.");
            return;
        }

        if (!selectedGroup) return;

        try {
            setActionLoading(true);

            await api.post(
                `/groups/${selectedGroup}/members`,
                { mobile: memberMobile }
            );

            setMemberMobile("");
            setMessage("Member added successfully!");
            await fetchGroups();
        } catch (err) {
            handleError(err, "Unable to add member.");
        } finally {
            setActionLoading(false);
        }
    };

    // Contribute to group
    const handleContribution = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (
            !/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(contributionAmount) ||
            Number(contributionAmount) <= 0
        ) {
            setError("Enter a valid contribution amount.");
            return;
        }

        try {
            setActionLoading(true);

            await api.post(
                `/groups/${selectedGroup}/contributions`,
                { amount: contributionAmount }
            );

            setContributionAmount("");
            setMessage("Contribution successful!");

            await fetchGroupWallet(selectedGroup);
        } catch (err) {
            handleError(err, "Contribution failed.");
        } finally {
            setActionLoading(false);
        }
    };

    // Request group withdrawal
    const handleWithdrawal = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (
            !/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(withdrawalAmount) ||
            Number(withdrawalAmount) <= 0
        ) {
            setError("Enter a valid withdrawal amount.");
            return;
        }

        if (Number(withdrawalAmount) > groupWallet.available) {
            setError("Insufficient available group balance.");
            return;
        }

        try {
            setActionLoading(true);

            const response = await api.post(
                `/groups/${selectedGroup}/withdrawals`,
                { amount: withdrawalAmount }
            );

            setWithdrawalAmount("");
            setMessage(
                response.data.message ||
                "Withdrawal request submitted for approval."
            );

            await fetchGroupWallet(selectedGroup);
        } catch (err) {
            handleError(err, "Unable to request withdrawal.");
        } finally {
            setActionLoading(false);
        }
    };

    // Approve or reject withdrawal
    const handleReviewWithdrawal = async (action) => {
        setMessage("");
        setError("");

        if (!withdrawalId || !/^[1-9]\d*$/.test(withdrawalId)) {
            setError("Enter a valid withdrawal ID.");
            return;
        }

        try {
            setActionLoading(true);

            const endpoint =
                action === "APPROVE" ? "approve" : "reject";

            const response = await api.post(
                `/groups/${selectedGroup}/withdrawals/${withdrawalId}/${endpoint}`
            );

            setWithdrawalId("");
            setMessage(
                response.data.message ||
                `Withdrawal ${action.toLowerCase()}d successfully.`
            );

            await fetchGroupWallet(selectedGroup);
        } catch (err) {
            handleError(err, `Unable to ${action.toLowerCase()} withdrawal.`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    const selectedGroupData = groups.find(
        (group) => String(group.id) === String(selectedGroup)
    );

    return (
        <div className="group-page">

            <header className="group-header">
                <div className="group-brand">
                    <div className="group-logo">CP</div>
                    <span>Community Wallet</span>
                </div>

                <div className="group-header-actions">
                    <button onClick={() => navigate("/dashboard")}>
                        My Wallet
                    </button>

                    <button
                        className="group-logout"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="group-container">

                <section className="group-heading">
                    <div>
                        <p className="group-eyebrow">COMMUNITY</p>
                        <h1>Group Wallets</h1>
                        <p>Manage contributions and group withdrawals.</p>
                    </div>

                    <button
                        className="group-refresh"
                        onClick={() => {
                            fetchGroups();
                            if (selectedGroup) {
                                fetchGroupWallet(selectedGroup);
                            }
                        }}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                </section>

                {message && (
                    <div className="group-success">{message}</div>
                )}

                {error && (
                    <div className="group-error">{error}</div>
                )}

                {/* Create group */}
                <section className="group-panel">
                    <h2>Create a Group</h2>
                    <p>Create a new community group and become its leader.</p>

                    <form
                        className="group-inline-form"
                        onSubmit={handleCreateGroup}
                    >
                        <input
                            type="text"
                            placeholder="Enter group name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            maxLength={100}
                            required
                            disabled={actionLoading}
                        />

                        <button disabled={actionLoading}>
                            Create Group
                        </button>
                    </form>
                </section>

                {/* Group selector */}
                <section className="group-panel">
                    <h2>Your Groups</h2>

                    {loading && groups.length === 0 ? (
                        <p>Loading groups...</p>
                    ) : groups.length === 0 ? (
                        <p className="group-empty">
                            You haven't joined any groups yet.
                        </p>
                    ) : (
                        <>
                            <label htmlFor="group-select">
                                Select a group
                            </label>

                            <select
                                id="group-select"
                                value={selectedGroup}
                                onChange={(e) =>
                                    setSelectedGroup(e.target.value)
                                }
                            >
                                {groups.map((group) => (
                                    <option
                                        key={group.id}
                                        value={group.id}
                                    >
                                        {group.name || `Group ${group.id}`}
                                    </option>
                                ))}
                            </select>

                            {selectedGroupData && (
                                <p className="group-selected-name">
                                    Selected: {selectedGroupData.name}
                                </p>
                            )}
                        </>
                    )}
                </section>

                {/* Group wallet */}
                {selectedGroup && (
                    <>
                        <section className="group-balance-cards">

                            <div className="group-balance-card">
                                <p>Total Group Balance</p>
                                <h2>
                                    ₹{formatAmount(groupWallet.balance)}
                                </h2>
                            </div>

                            <div className="group-balance-card group-available">
                                <p>Available Balance</p>
                                <h2>
                                    ₹{formatAmount(groupWallet.available)}
                                </h2>
                            </div>

                            <div className="group-balance-card group-pending">
                                <p>Pending Withdrawals</p>
                                <h2>
                                    ₹{formatAmount(groupWallet.pending)}
                                </h2>
                            </div>

                        </section>

                        {/* Add member */}
                        <section className="group-panel">
                            <h2>Add Group Member</h2>
                            <p>Add an existing registered user by mobile number.</p>

                            <form
                                className="group-inline-form"
                                onSubmit={handleAddMember}
                            >
                                <input
                                    type="tel"
                                    placeholder="10-digit mobile number"
                                    value={memberMobile}
                                    onChange={(e) =>
                                        setMemberMobile(e.target.value)
                                    }
                                    maxLength={10}
                                    required
                                    disabled={actionLoading}
                                />

                                <button disabled={actionLoading}>
                                    Add Member
                                </button>
                            </form>
                        </section>

                        {/* Contribution */}
                        <section className="group-panel">
                            <h2>Contribute Points</h2>
                            <p>Move points from your personal wallet into this group.</p>

                            <form
                                className="group-inline-form"
                                onSubmit={handleContribution}
                            >
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="Contribution amount"
                                    value={contributionAmount}
                                    onChange={(e) =>
                                        setContributionAmount(e.target.value)
                                    }
                                    required
                                    disabled={actionLoading}
                                />

                                <button disabled={actionLoading}>
                                    Contribute
                                </button>
                            </form>
                        </section>

                        {/* Withdrawal request */}
                        <section className="group-panel">
                            <h2>Request Withdrawal</h2>
                            <p>
                                Request a withdrawal. The amount is reserved
                                until the group leader reviews it.
                            </p>

                            <form
                                className="group-inline-form"
                                onSubmit={handleWithdrawal}
                            >
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="Withdrawal amount"
                                    value={withdrawalAmount}
                                    onChange={(e) =>
                                        setWithdrawalAmount(e.target.value)
                                    }
                                    required
                                    disabled={actionLoading}
                                />

                                <button disabled={actionLoading}>
                                    Request Withdrawal
                                </button>
                            </form>
                        </section>

                        {/* Leader review */}
                        <section className="group-panel review-panel">
                            <h2>Review Withdrawal Request</h2>
                            <p>
                                Group leaders can approve or reject a pending
                                request using its withdrawal ID.
                            </p>

                            <input
                                type="number"
                                min="1"
                                placeholder="Enter withdrawal ID"
                                value={withdrawalId}
                                onChange={(e) =>
                                    setWithdrawalId(e.target.value)
                                }
                                disabled={actionLoading}
                            />

                            <div className="review-buttons">
                                <button
                                    className="approve-button"
                                    onClick={() =>
                                        handleReviewWithdrawal("APPROVE")
                                    }
                                    disabled={actionLoading}
                                >
                                    Approve
                                </button>

                                <button
                                    className="reject-button"
                                    onClick={() =>
                                        handleReviewWithdrawal("REJECT")
                                    }
                                    disabled={actionLoading}
                                >
                                    Reject
                                </button>
                            </div>
                        </section>
                    </>
                )}

            </main>
        </div>
    );
}

export default GroupWallet;
