"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "../../lib/api";
import "./styles.css";
import {
  BsEyeFill,
  BsEyeSlashFill,
  BsLightningChargeFill,
} from "react-icons/bs";
import {
  FaCopy,
  FaCreditCard,
  FaLock,
  FaWallet,
  FaHistory,
  FaSignOutAlt,
  FaChevronRight,
  FaPaperPlane,
  FaDownload,
  FaPlus,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import {
  IoHome,
  IoCard,
  IoSwapHorizontal,
  IoSettings,
  IoNotifications,
  IoDiamond,
  IoFlash,
} from "react-icons/io5";
import { HiCube, HiTrendingUp } from "react-icons/hi";
import { CiWarning } from "react-icons/ci";
import { BiStar } from "react-icons/bi";

interface CardData {
  cardId: string;
  cardNumber: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardCvv: string;
  cardStatus: string;
  balance: number;
  spentThisMonth: number;
  limit: number;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Transaction {
  id: string;
  type: "incoming" | "outgoing";
  method: "card";
  amount: number;
  currency: string;
  description: string;
  status: "completed" | "pending" | "failed";
  date: string;
  icon?: string;
}

type ActiveTab =
  | "dashboard"
  | "cards"
  | "payments"
  | "transactions"
  | "settings"
  | "nft";
type PaymentModal = null | "send" | "receive";

export default function CustomerPage() {
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullCard, setShowFullCard] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [showPaymentModal, setShowPaymentModal] = useState<PaymentModal>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          setError("Please login first");
          setLoading(false);
          return;
        }

        // Fetch user profile and card details
        const profileResponse = await fetch(
          `${API_BASE}/api/customer/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!profileResponse.ok) {
          throw new Error("Failed to fetch profile");
        }

        const profileData = await profileResponse.json();
        setUserData(profileData.user);

        // Fetch card details
        const cardResponse = await fetch(
          `${API_BASE}/api/customer/card`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (cardResponse.ok) {
          const cardDataResponse = await cardResponse.json();
          setCardData({
            cardId: cardDataResponse.card.cardId,
            cardNumber: cardDataResponse.card.cardNumber,
            cardBrand: cardDataResponse.card.cardBrand,
            cardLast4: cardDataResponse.card.cardLast4,
            cardExpMonth: cardDataResponse.card.cardExpMonth,
            cardExpYear: cardDataResponse.card.cardExpYear,
            cardCvv: cardDataResponse.card.cardCvv,
            cardStatus: cardDataResponse.card.cardStatus,
            balance: 0,
            spentThisMonth: 0,
            limit: 0,
          });
        }

        // Set empty transactions for now
        setTransactions([]);

        setLoading(false);
      } catch (err) {
        setError("Failed to load user data");
        setLoading(false);
        console.error(err);
      }
    };

    fetchUserData();
  }, []);

  const formatCardNumber = (number: string, masked: boolean = true) => {
    if (masked) {
      const parts = number.split(" ");
      return `•••• •••• •••• ${parts[parts.length - 1]}`;
    }
    return number;
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    console.log(`Copied ${label}: ${text}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <FaCheckCircle className="status-icon completed" />;
      case "pending":
        return <FaClock className="status-icon pending" />;
      case "failed":
        return <FaClock className="status-icon failed" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-content">
          <div className="loading-logo">
            <div className="logo-pulse">OP</div>
          </div>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-content">
          <div className="error-icon">
            <CiWarning />
          </div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <span>OP</span>
            </div>
            <h1>OpenPay</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-section-title">MENU</span>
            <button
              className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <IoHome className="nav-icon" />
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-item ${activeTab === "cards" ? "active" : ""}`}
              onClick={() => setActiveTab("cards")}
            >
              <IoCard className="nav-icon" />
              <span>Virtual Cards</span>
            </button>
            <button
              className={`nav-item ${activeTab === "payments" ? "active" : ""}`}
              onClick={() => setActiveTab("payments")}
            >
              <IoSwapHorizontal className="nav-icon" />
              <span>Payments</span>
            </button>
            <button
              className={`nav-item ${activeTab === "transactions" ? "active" : ""}`}
              onClick={() => setActiveTab("transactions")}
            >
              <FaHistory className="nav-icon" />
              <span>Transactions</span>
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-section-title">SETTINGS</span>
            <button
              className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <IoSettings className="nav-icon" />
              <span>Settings</span>
            </button>
            <button className="nav-item">
              <FaSignOutAlt className="nav-icon" />
              <span>Logout</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <BiStar />
            </div>
            <h4>Upgrade to Pro</h4>
            <p>Get unlimited transactions & premium features</p>
            <button className="btn-upgrade">Upgrade Now</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h2 className="page-title">
              {activeTab === "dashboard" && "Dashboard"}
              {activeTab === "cards" && "Virtual Cards"}
              {activeTab === "payments" && "Payments"}
              {activeTab === "transactions" && "Transactions"}
              {activeTab === "settings" && "Settings"}
            </h2>
            <p className="page-subtitle">
              {activeTab === "dashboard" &&
                "Welcome back! Here's your financial overview."}
              {activeTab === "cards" && "Manage your virtual cards"}
              {activeTab === "payments" && "Send and receive payments"}
              {activeTab === "transactions" && "View all your transactions"}
              {activeTab === "settings" && "Manage your account settings"}
            </p>
          </div>

          <div className="header-right">
            <button className="header-btn notification-btn">
              <IoNotifications />
              <span className="notification-dot"></span>
            </button>
            <div className="user-dropdown">
              <div className="user-avatar">
                {userData?.name?.charAt(0) || "U"}
              </div>
              <div className="user-info">
                <span className="user-name">{userData?.name}</span>
                <span className="user-role">Premium Member</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="content-area">
          {activeTab === "dashboard" && (
            <div className="dashboard-content">
              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card primary">
                  <div className="stat-icon">
                    <FaWallet />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Total Balance</span>
                    <span className="stat-value">
                      {formatCurrency(cardData?.balance || 0)}
                    </span>
                    <span className="stat-change positive">
                      <HiTrendingUp /> +12.5% from last month
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon secondary">
                    <FaCreditCard />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Spent This Month</span>
                    <span className="stat-value">
                      {formatCurrency(cardData?.spentThisMonth || 0)}
                    </span>
                    <span className="stat-change">
                      of {formatCurrency(cardData?.limit || 0)} limit
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions-section">
                <h3>Quick Actions</h3>
                <div className="quick-actions-grid">
                  <button
                    className="quick-action"
                    onClick={() => setShowPaymentModal("send")}
                  >
                    <div className="quick-action-icon send">
                      <FaPaperPlane />
                    </div>
                    <span>Send Money</span>
                  </button>
                  <button
                    className="quick-action"
                    onClick={() => setShowPaymentModal("receive")}
                  >
                    <div className="quick-action-icon receive">
                      <FaDownload />
                    </div>
                    <span>Receive</span>
                  </button>
                  <button
                    className="quick-action"
                    onClick={() => setActiveTab("cards")}
                  >
                    <div className="quick-action-icon card">
                      <FaPlus />
                    </div>
                    <span>New Card</span>
                  </button>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="dashboard-columns">
                {/* Virtual Card Preview */}
                <div className="column-section">
                  <div className="section-header">
                    <h3>Your Card</h3>
                    <button
                      className="btn-text"
                      onClick={() => setActiveTab("cards")}
                    >
                      Manage Cards <FaChevronRight />
                    </button>
                  </div>
                  <div className="card-preview-container">
                    <div className="virtual-card">
                      <div className="card-bg-pattern"></div>
                      <div className="card-content">
                        <div className="card-header">
                          <div className="card-chip">
                            <div className="chip-line"></div>
                            <div className="chip-line"></div>
                            <div className="chip-line"></div>
                          </div>
                          <div className="card-brand">
                            {cardData?.cardBrand}
                          </div>
                        </div>
                        <div className="card-number-display">
                          <span>
                            {formatCardNumber(
                              cardData?.cardNumber || "",
                              !showFullCard
                            )}
                          </span>
                          <button
                            className="toggle-visibility-btn"
                            onClick={() => setShowFullCard(!showFullCard)}
                          >
                            {showFullCard ? <BsEyeFill /> : <BsEyeSlashFill />}
                          </button>
                        </div>
                        <div className="card-details">
                          <div className="card-holder">
                            <span className="label">CARD HOLDER</span>
                            <span className="value">
                              {userData?.name?.toUpperCase()}
                            </span>
                          </div>
                          <div className="card-expiry">
                            <span className="label">EXPIRES</span>
                            <span className="value">
                              {String(cardData?.cardExpMonth).padStart(2, "0")}/
                              {cardData?.cardExpYear}
                            </span>
                          </div>
                          <div className="card-cvv">
                            <span className="label">CVV</span>
                            <span className="value">
                              {showFullCard ? cardData?.cardCvv : "•••"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="card-status-badge">
                        {cardData?.cardStatus}
                      </div>
                    </div>
                    <div className="card-actions">
                      <button
                        className="btn-card-action"
                        onClick={() =>
                          copyToClipboard(
                            cardData?.cardNumber || "",
                            "Card number"
                          )
                        }
                      >
                        <FaCopy /> Copy Number
                      </button>
                      <button
                        className="btn-card-action"
                        onClick={() =>
                          copyToClipboard(cardData?.cardCvv || "", "CVV")
                        }
                      >
                        <FaLock /> Copy CVV
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="column-section">
                  <div className="section-header">
                    <h3>Recent Transactions</h3>
                    <button
                      className="btn-text"
                      onClick={() => setActiveTab("transactions")}
                    >
                      View All <FaChevronRight />
                    </button>
                  </div>
                  <div className="transactions-list">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="transaction-item">
                        <div className="transaction-icon">
                          <span>{tx.icon}</span>
                        </div>
                        <div className="transaction-info">
                          <span className="transaction-desc">
                            {tx.description}
                          </span>
                          <span className="transaction-date">{tx.date}</span>
                        </div>
                        <div className="transaction-amount">
                          <span className={`amount ${tx.type}`}>
                            {tx.type === "incoming" ? "+" : "-"}
                            {tx.currency === "USD"
                              ? formatCurrency(tx.amount)
                              : `${tx.amount} ${tx.currency}`}
                          </span>
                          {getStatusIcon(tx.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "cards" && (
            <div className="cards-content">
              <div className="cards-grid">
                <div className="card-full-view">
                  <div className="virtual-card large">
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="card-header">
                        <div className="card-chip large">
                          <div className="chip-line"></div>
                          <div className="chip-line"></div>
                          <div className="chip-line"></div>
                        </div>
                        <div className="card-brand">{cardData?.cardBrand}</div>
                      </div>
                      <div className="card-number-display large">
                        <span>
                          {formatCardNumber(
                            cardData?.cardNumber || "",
                            !showFullCard
                          )}
                        </span>
                        <button
                          className="toggle-visibility-btn"
                          onClick={() => setShowFullCard(!showFullCard)}
                        >
                          {showFullCard ? <BsEyeSlashFill /> : <BsEyeFill />}
                        </button>
                      </div>
                      <div className="card-details">
                        <div className="card-holder">
                          <span className="label">CARD HOLDER</span>
                          <span className="value">
                            {userData?.name?.toUpperCase()}
                          </span>
                        </div>
                        <div className="card-expiry">
                          <span className="label">EXPIRES</span>
                          <span className="value">
                            {String(cardData?.cardExpMonth).padStart(2, "0")}/
                            {cardData?.cardExpYear}
                          </span>
                        </div>
                        <div className="card-cvv">
                          <span className="label">CVV</span>
                          <span className="value">
                            {showFullCard ? cardData?.cardCvv : "•••"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="card-status-badge">
                      {cardData?.cardStatus}
                    </div>
                  </div>

                  <div className="card-details-panel">
                    <h3>Card Details</h3>
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Card Number</span>
                        <div className="detail-value-row">
                          <span className="detail-value">
                            {formatCardNumber(
                              cardData?.cardNumber || "",
                              !showFullCard
                            )}
                          </span>
                          <button
                            className="copy-btn"
                            onClick={() =>
                              copyToClipboard(
                                cardData?.cardNumber || "",
                                "Card number"
                              )
                            }
                          >
                            <FaCopy />
                          </button>
                        </div>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">CVV</span>
                        <div className="detail-value-row">
                          <span className="detail-value">
                            {showFullCard ? cardData?.cardCvv : "•••"}
                          </span>
                          <button
                            className="copy-btn"
                            onClick={() =>
                              copyToClipboard(cardData?.cardCvv || "", "CVV")
                            }
                          >
                            <FaCopy />
                          </button>
                        </div>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Expiry Date</span>
                        <span className="detail-value">
                          {String(cardData?.cardExpMonth).padStart(2, "0")}/
                          {cardData?.cardExpYear}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status</span>
                        <span
                          className={`status-badge ${cardData?.cardStatus.toLowerCase()}`}
                        >
                          {cardData?.cardStatus}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Available Balance</span>
                        <span className="detail-value large">
                          {formatCurrency(cardData?.balance || 0)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Spending Limit</span>
                        <span className="detail-value">
                          {formatCurrency(cardData?.limit || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="spending-progress">
                      <div className="progress-header">
                        <span>Monthly Spending</span>
                        <span>
                          {formatCurrency(cardData?.spentThisMonth || 0)} /{" "}
                          {formatCurrency(cardData?.limit || 0)}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${((cardData?.spentThisMonth || 0) / (cardData?.limit || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="card-actions-panel">
                      <button className="btn-primary">
                        <IoFlash /> Add Funds
                      </button>
                      <button className="btn-secondary">
                        <FaLock /> Freeze Card
                      </button>
                      <button className="btn-secondary">
                        <IoSettings /> Card Settings
                      </button>
                    </div>
                  </div>
                </div>

                <div className="add-card-section">
                  <button className="add-card-btn">
                    <FaPlus />
                    <span>Create New Virtual Card</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="payments-content">
              <div className="payment-methods-grid">
                <div
                  className="payment-method-card"
                  onClick={() => setShowPaymentModal("send")}
                >
                  <div className="method-icon send">
                    <FaPaperPlane />
                  </div>
                  <h4>Send Money</h4>
                  <p>Transfer to anyone, anywhere</p>
                  <FaChevronRight className="arrow-icon" />
                </div>

                <div
                  className="payment-method-card"
                  onClick={() => setShowPaymentModal("receive")}
                >
                  <div className="method-icon receive">
                    <FaDownload />
                  </div>
                  <h4>Receive Payment</h4>
                  <p>Get paid via link</p>
                  <FaChevronRight className="arrow-icon" />
                </div>
              </div>

              <div className="payment-features">
                <h3>Payment Features</h3>
                <div className="features-grid">
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-info">
                      <h4>Secure Transactions</h4>
                      <p>Bank-grade encryption for all your payments</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">
                      <BsLightningChargeFill />
                    </div>
                    <div className="feature-info">
                      <h4>Instant Transfers</h4>
                      <p>Send and receive money in seconds</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">
                      <HiCube />
                    </div>
                    <div className="feature-info">
                      <h4>Multi-Chain Support</h4>
                      <p>Ethereum, Solana, Polygon & more</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">
                      <IoDiamond />
                    </div>
                    <div className="feature-info">
                      <h4>NFT Integration</h4>
                      <p>Use NFTs as payment or collateral</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="transactions-content">
              <div className="transactions-filters">
                <button className="filter-btn active">All</button>
                <button className="filter-btn">Incoming</button>
                <button className="filter-btn">Outgoing</button>
                <button className="filter-btn">Card</button>
                <button className="filter-btn">Crypto</button>
                <button className="filter-btn">NFT</button>
              </div>

              <div className="transactions-table">
                <div className="table-header">
                  <span>Transaction</span>
                  <span>Method</span>
                  <span>Date</span>
                  <span>Status</span>
                  <span>Amount</span>
                </div>
                {transactions.map((tx) => (
                  <div key={tx.id} className="table-row">
                    <div className="tx-info">
                      <span className="tx-icon">{tx.icon}</span>
                      <span className="tx-desc">{tx.description}</span>
                    </div>
                    <span className="tx-method">{tx.method.toUpperCase()}</span>
                    <span className="tx-date">{tx.date}</span>
                    <span className={`tx-status ${tx.status}`}>
                      {getStatusIcon(tx.status)}
                      {tx.status}
                    </span>
                    <span className={`tx-amount ${tx.type}`}>
                      {tx.type === "incoming" ? "+" : "-"}
                      {tx.currency === "USD"
                        ? formatCurrency(tx.amount)
                        : `${tx.amount} ${tx.currency}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="settings-content">
              <div className="settings-section">
                <h3>Account Settings</h3>
                <div className="settings-grid">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Profile Information</h4>
                      <p>Update your name, email, and profile picture</p>
                    </div>
                    <FaChevronRight />
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Security</h4>
                      <p>Manage password and 2FA</p>
                    </div>
                    <FaChevronRight />
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Notification Preferences</h4>
                      <p>Choose what alerts you receive</p>
                    </div>
                    <FaChevronRight />
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Connected Wallets</h4>
                      <p>Manage your crypto wallets</p>
                    </div>
                    <FaChevronRight />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Payment Modals */}
      {showPaymentModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPaymentModal(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowPaymentModal(null)}
            >
              ×
            </button>

            {showPaymentModal === "send" && (
              <div className="modal-body">
                <div className="modal-icon send">
                  <FaPaperPlane />
                </div>
                <h2>Send Money</h2>
                <p>Transfer funds to anyone, anywhere</p>
                <div className="form-group">
                  <label>Recipient</label>
                  <input
                    type="text"
                    placeholder="Enter email or wallet address"
                  />
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <div className="amount-input">
                    <span className="currency">$</span>
                    <input type="number" placeholder="0.00" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Note (Optional)</label>
                  <input type="text" placeholder="What's this for?" />
                </div>
                <button className="btn-primary full-width">Send Money</button>
              </div>
            )}

            {showPaymentModal === "receive" && (
              <div className="modal-body">
                <div className="modal-icon receive">
                  <FaDownload />
                </div>
                <h2>Receive Payment</h2>
                <p>Share your payment link</p>
                <div className="payment-link">
                  <input type="text" value="openpay.me/johndoe" readOnly />
                  <button className="copy-btn">
                    <FaCopy />
                  </button>
                </div>
                <button className="btn-primary full-width">Share Link</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
