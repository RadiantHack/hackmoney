"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { log } from "@openpay/logger";
import { API_BASE } from "../lib/api";
import "./auth.css";
import { SignInWithBaseButton } from "@base-org/account-ui/react";
import { createBaseAccountSDK } from "@base-org/account";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup_merchant" | "signin_customer">(
    "signup_merchant"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMerchantForm, setShowMerchantForm] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [merchantForm, setMerchantForm] = useState({ name: "", businessName: "" });
  const [merchantFormErrors, setMerchantFormErrors] = useState<
    Record<string, string>
  >({});

  log("LiquidCard Portal");

  async function signInWithBase(): Promise<void> {
    setLoading(true);
    setError("");
    try {
      const provider = createBaseAccountSDK({
        appName: "LiquidCard",
      }).getProvider();

      const nonceRes = await fetch(`${API_BASE}/api/auth/nonce`);
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce");
      const nonce = await nonceRes.text();

      const resp = await provider.request({
        method: "wallet_connect",
        params: [
          {
            version: "1",
            capabilities: {
              signInWithEthereum: {
                nonce,
                chainId: "0x2105",
              },
            },
          },
        ],
      });
      const { accounts } = resp as { accounts: Array<{ address: string; capabilities?: { signInWithEthereum?: { message: string; signature: string } } }> };

      const { address } = accounts[0];
      const siweData = accounts[0].capabilities?.signInWithEthereum;

      if (!siweData?.message || !siweData?.signature) {
        throw new Error("SIWE data missing from response");
      }

      const { message, signature } = siweData;

      const intent =
        mode === "signup_merchant" ? "signup_merchant" : "signin_customer";

      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, message, signature, intent }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.error || "Verification failed");
      }

      if (body.needsMerchantDetails && body.tempToken) {
        setTempToken(body.tempToken);
        setShowMerchantForm(true);
        setLoading(false);
        return;
      }

      localStorage.setItem("accessToken", body.accessToken);
      localStorage.setItem("refreshToken", body.refreshToken);
      localStorage.setItem("user", JSON.stringify(body.user));

      if (body.user?.role === "MERCHANT") {
        router.push("/merchant");
      } else {
        router.push("/customer");
      }
    } catch (err) {
      console.error("[Base Auth] Error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function validateMerchantForm(): boolean {
    const errors: Record<string, string> = {};
    if (!merchantForm.name.trim()) errors.name = "Name is required";
    if (!merchantForm.businessName.trim())
      errors.businessName = "Business name is required";
    setMerchantFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitMerchantForm(e: React.FormEvent) {
    e.preventDefault();
    if (!validateMerchantForm()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/complete-merchant-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken,
          name: merchantForm.name.trim(),
          businessName: merchantForm.businessName.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Sign up failed");
      }
      localStorage.setItem("accessToken", body.accessToken);
      localStorage.setItem("refreshToken", body.refreshToken);
      localStorage.setItem("user", JSON.stringify(body.user));
      router.push("/merchant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="hero-section">
        <h1 className="title">
          LiquidCard
          <span className="title-accent"> Payment Platform</span>
        </h1>
        <p className="description">
          Welcome to LiquidCard. Sign in as a customer or sign up as a merchant
          with your wallet.
        </p>
      </div>

      <div className="form-wrapper">
        <div className="tabs">
          <button
            type="button"
            className={`tab ${mode === "signup_merchant" ? "active" : ""}`}
            onClick={() => {
              setMode("signup_merchant");
              setError("");
              setShowMerchantForm(false);
            }}
            aria-selected={mode === "signup_merchant"}
          >
            Sign up merchant
          </button>
          <button
            type="button"
            className={`tab ${mode === "signin_customer" ? "active" : ""}`}
            onClick={() => {
              setMode("signin_customer");
              setError("");
              setShowMerchantForm(false);
            }}
            aria-selected={mode === "signin_customer"}
          >
            Sign in customer
          </button>
        </div>

        {error && (
          <div className="error-message" role="alert">
            <svg
              className="error-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        {showMerchantForm ? (
          <form onSubmit={submitMerchantForm} className="form" noValidate>
            <div className="form-group">
              <label htmlFor="name">Your name</label>
              <div className="input-wrapper">
                <input
                  id="name"
                  type="text"
                  value={merchantForm.name}
                  onChange={(e) =>
                    setMerchantForm({ ...merchantForm, name: e.target.value })
                  }
                  placeholder="Your name"
                  className={merchantFormErrors.name ? "input-error" : ""}
                  aria-invalid={!!merchantFormErrors.name}
                />
                {merchantFormErrors.name && (
                  <span className="field-error">{merchantFormErrors.name}</span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="businessName">Business name</label>
              <div className="input-wrapper">
                <input
                  id="businessName"
                  type="text"
                  value={merchantForm.businessName}
                  onChange={(e) =>
                    setMerchantForm({
                      ...merchantForm,
                      businessName: e.target.value,
                    })
                  }
                  placeholder="Your business name"
                  className={merchantFormErrors.businessName ? "input-error" : ""}
                  aria-invalid={!!merchantFormErrors.businessName}
                />
                {merchantFormErrors.businessName && (
                  <span className="field-error">
                    {merchantFormErrors.businessName}
                  </span>
                )}
              </div>
            </div>
            <button
              type="submit"
              className={`button ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Completing sign up...
                </>
              ) : (
                <>
                  Complete sign up
                  <svg
                    className="button-arrow"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="form">
            <p className="wallet-prompt">
              {mode === "signup_merchant"
                ? "Connect your wallet to sign up as a merchant."
                : "Connect your wallet to sign in as a customer."}
            </p>
            <SignInWithBaseButton
              colorScheme="system"
              onClick={() => signInWithBase()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
