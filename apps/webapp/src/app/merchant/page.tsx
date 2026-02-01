"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./merchant.css";
import {
  FaCreditCard,
  FaChartLine,
  FaHistory,
  FaStore,
  FaMobileAlt,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { IoSettings, IoWallet } from "react-icons/io5";

interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  customer?: {
    user: {
      name: string | null;
      email: string;
    };
  };
}

interface PaymentStats {
  totalPayments: number;
  todayPayments: number;
  monthPayments: number;
  totalRevenue: string;
}

export default function MerchantPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "payments" | "terminal" | "settings">("dashboard");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminalActive, setTerminalActive] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastPaymentStatus, setLastPaymentStatus] = useState<"success" | "failed" | null>(null);

  useEffect(() => {
    loadMerchantData();
  }, []);

  async function loadMerchantData() {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/");
        return;
      }

      // Load payments
      const paymentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/merchant/payments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to load merchant data:", error);
      setLoading(false);
    }
  }

  async function handleCardTap(cardNumber: string, cardCvv?: string) {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setProcessingPayment(true);
    setLastPaymentStatus(null);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/merchant/payment/tap`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cardNumber,
            cardCvv,
            amount: parseFloat(paymentAmount),
            currency: "USD",
            description: paymentDescription || `Payment of $${paymentAmount}`,
            terminalId: "WEB-TERMINAL-1",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setLastPaymentStatus("success");
        setPaymentAmount("");
        setPaymentDescription("");
        loadMerchantData();
      } else {
        setLastPaymentStatus("failed");
        alert(data.error || "Payment failed");
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      setLastPaymentStatus("failed");
      alert("Payment processing failed");
    } finally {
      setProcessingPayment(false);
      setTimeout(() => setLastPaymentStatus(null), 3000);
    }
  }

  function formatCurrency(amount: number | string): string {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="merchant-container loading">
        <div className="loading-spinner"></div>
        <p>Loading merchant dashboard...</p>
      </div>
    );
  }

  return (
    <div className="merchant-container">
      <div className="merchant-sidebar">
        <div className="merchant-logo">
          <IoWallet className="logo-icon" />
          <h2>Merchant Portal</h2>
        </div>

        <nav className="merchant-nav">
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <FaChartLine className="nav-icon" />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeTab === "terminal" ? "active" : ""}`}
            onClick={() => setActiveTab("terminal")}
          >
            <FaCreditCard className="nav-icon" />
            <span>Payment Terminal</span>
          </button>
          <button
            className={`nav-item ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            <FaHistory className="nav-icon" />
            <span>Transaction History</span>
          </button>
          <button
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <IoSettings className="nav-icon" />
            <span>Settings</span>
          </button>
        </nav>

        <button className="logout-btn" onClick={() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          router.push("/");
        }}>
          Logout
        </button>
      </div>

      <div className="merchant-main">
        {activeTab === "dashboard" && (
          <div className="dashboard-content">
            <h1>Dashboard</h1>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaChartLine />
                </div>
                <div className="stat-content">
                  <h3>Total Revenue</h3>
                  <p className="stat-value">{formatCurrency(stats?.totalRevenue || 0)}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaHistory />
                </div>
                <div className="stat-content">
                  <h3>Total Transactions</h3>
                  <p className="stat-value">{payments.filter(p => p.status === "COMPLETED").length}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FaStore />
                </div>
                <div className="stat-content">
                  <h3>Today's Payments</h3>
                  <p className="stat-value">
                    {payments.filter(p => {
                      const paymentDate = new Date(p.createdAt);
                      const today = new Date();
                      return paymentDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="recent-transactions">
              <h2>Recent Transactions</h2>
              <div className="transactions-list">
                {payments.slice(0, 10).map((payment) => (
                  <div key={payment.id} className="transaction-item">
                    <div className="transaction-info">
                      <FaCreditCard className="transaction-icon" />
                      <div>
                        <p className="transaction-customer">
                          {payment.customer?.user.name || "Unknown Customer"}
                        </p>
                        <p className="transaction-date">{formatDate(payment.createdAt)}</p>
                      </div>
                    </div>
                    <div className="transaction-amount">
                      <p className="amount">{formatCurrency(payment.amount)}</p>
                      <span className={`status ${payment.status.toLowerCase()}`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="terminal-content">
            <h1>Payment Terminal</h1>
            
            <div className="terminal-panel">
              <div className="terminal-display">
                {lastPaymentStatus === "success" && (
                  <div className="payment-status success">
                    <FaCheck className="status-icon" />
                    <p>Payment Successful!</p>
                  </div>
                )}
                {lastPaymentStatus === "failed" && (
                  <div className="payment-status failed">
                    <FaTimes className="status-icon" />
                    <p>Payment Failed</p>
                  </div>
                )}
                {!lastPaymentStatus && (
                  <div className="tap-instruction">
                    <FaMobileAlt className="tap-icon" />
                    <p>Ready to accept payments</p>
                    <p className="tap-subtext">Enter amount and tap card to pay</p>
                  </div>
                )}
              </div>

              <div className="terminal-input">
                <div className="form-group">
                  <label>Amount</label>
                  <div className="amount-input">
                    <span className="currency">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      disabled={processingPayment}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Item description"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    disabled={processingPayment}
                  />
                </div>

                {/* Simulated card tap - In production, this would be NFC hardware */}
                <div className="test-payment-section">
                  <p className="test-label">Test Payment (Development Mode)</p>
                  <button
                    className="btn-primary"
                    onClick={() => handleCardTap("4532015112830366")}
                    disabled={processingPayment || !paymentAmount}
                  >
                    {processingPayment ? "Processing..." : "Simulate Card Tap"}
                  </button>
                </div>
              </div>
            </div>

            <div className="terminal-info">
              <h3>Terminal Information</h3>
              <p><strong>Terminal ID:</strong> WEB-TERMINAL-1</p>
              <p><strong>Status:</strong> <span className="status-active">Active</span></p>
              <p><strong>Connection:</strong> Online</p>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="payments-content">
            <h1>Transaction History</h1>
            
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.createdAt)}</td>
                      <td>{payment.customer?.user.name || payment.customer?.user.email || "N/A"}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>
                        <span className={`badge ${payment.status.toLowerCase()}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="settings-content">
            <h1>Settings</h1>
            <p>Merchant settings and configuration options will be available here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

