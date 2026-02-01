"use client";

import React, { useState, useEffect } from "react";
import { createSubAccount, getSubAccounts } from "../../../lib/masterAccount";
import { FaPlus, FaTimes, FaCheckCircle, FaClock } from "react-icons/fa";
import "./subaccounts.css";

interface SubAccount {
  address: string;
  name: string;
  createdAt: string;
  balance: number;
  status: "active" | "pending" | "revoked";
}

export default function SubAccountsManager() {
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Load existing sub-accounts on mount
  useEffect(() => {
    loadSubAccounts();
  }, []);

  async function loadSubAccounts() {
    try {
      setLoading(true);
      const masterAddress = localStorage.getItem("user");
      if (!masterAddress) return;

      const user = JSON.parse(masterAddress);
      const subs = await getSubAccounts(user.address, window.location.origin);
      
      // Transform to our format
      const formattedSubs: SubAccount[] = subs.map((sub: any) => ({
        address: sub.address,
        name: sub.name || `Sub Account ${sub.address.slice(0, 6)}`,
        createdAt: new Date().toISOString(),
        balance: 0,
        status: "active",
      }));

      setSubAccounts(formattedSubs);
    } catch (err) {
      console.error("[SubAccounts] Error loading:", err);
      setError("Failed to load sub-accounts");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSubAccount() {
    if (!formData.name.trim()) {
      setError("Sub-account name is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("[SubAccounts] Creating sub-account:", formData.name);
      
      // Call Base Account SDK to create sub-account
      const newAddress = await createSubAccount();
      
      if (!newAddress) {
        throw new Error("Failed to create sub-account");
      }

      console.log("[SubAccounts] Created successfully:", newAddress);

      const newSubAccount: SubAccount = {
        address: newAddress,
        name: formData.name,
        createdAt: new Date().toISOString(),
        balance: 0,
        status: "active",
      };

      setSubAccounts([...subAccounts, newSubAccount]);
      setSuccess(`Sub-account "${formData.name}" created successfully!`);
      
      // Save to localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const allSubAccounts = [...subAccounts, newSubAccount];
        localStorage.setItem(`subAccounts_${user.address}`, JSON.stringify(allSubAccounts));
      }

      // Reset form
      setFormData({ name: "", description: "" });
      setShowCreateForm(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[SubAccounts] Error creating:", err);
      setError(err instanceof Error ? err.message : "Failed to create sub-account");
    } finally {
      setLoading(false);
    }
  }

  function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return (
    <div className="subaccounts-manager">
      <div className="subaccounts-header">
        <div>
          <h2>Sub Accounts</h2>
          <p>Create and manage multiple sub-accounts for your family members</p>
        </div>
        <button
          className="btn-create-subaccount"
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={loading}
        >
          <FaPlus /> Create Sub Account
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <FaCheckCircle />
          <span>{success}</span>
        </div>
      )}

      {showCreateForm && (
        <div className="create-subaccount-form">
          <div className="form-group">
            <label htmlFor="subaccount-name">Sub Account Name</label>
            <input
              id="subaccount-name"
              type="text"
              placeholder="e.g., Sister - Grocery Card"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="subaccount-desc">Description (Optional)</label>
            <textarea
              id="subaccount-desc"
              placeholder="Add a description for this sub-account"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={handleCreateSubAccount}
              disabled={loading || !formData.name.trim()}
            >
              {loading ? "Creating..." : "Create Sub Account"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowCreateForm(false);
                setFormData({ name: "", description: "" });
              }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="subaccounts-list">
        {subAccounts.length === 0 ? (
          <div className="empty-state">
            <p>No sub-accounts yet</p>
            <p>Create your first sub-account to get started</p>
          </div>
        ) : (
          subAccounts.map((sub) => (
            <div key={sub.address} className="subaccount-card">
              <div className="card-header">
                <div>
                  <h3>{sub.name}</h3>
                  <p className="address">{formatAddress(sub.address)}</p>
                </div>
                <div className={`status-badge ${sub.status}`}>
                  {sub.status === "active" ? (
                    <>
                      <FaCheckCircle /> Active
                    </>
                  ) : (
                    <>
                      <FaClock /> {sub.status}
                    </>
                  )}
                </div>
              </div>

              <div className="card-content">
                <div className="info-row">
                  <span className="label">Address:</span>
                  <span className="value">{sub.address}</span>
                </div>
                <div className="info-row">
                  <span className="label">Balance:</span>
                  <span className="value">${sub.balance.toFixed(2)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Created:</span>
                  <span className="value">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="card-actions">
                <button className="btn-link">View Details</button>
                <button className="btn-link">Manage Permissions</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
