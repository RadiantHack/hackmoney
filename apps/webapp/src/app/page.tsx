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
      console.log("[Base Auth] Initializing SDK...");
      
      // Create SDK with timeout and error handling
      let provider;
      try {
        const sdk = createBaseAccountSDK({
          appName: "LiquidCard",
          appLogoUrl: "https://liquidcard.io/logo.png",
        });
        provider = sdk.getProvider();
      } catch (sdkErr) {
        console.error("[Base Auth] SDK initialization failed:", sdkErr);
        throw new Error("Failed to initialize Base wallet. Please ensure you have a compatible wallet installed.");
      }

      if (!provider) {
        throw new Error("Wallet provider not available. Please ensure Base wallet extension is installed and enabled.");
      }

      console.log("[Base Auth] Fetching nonce...");
      const nonceRes = await fetch(`${API_BASE}/api/auth/nonce`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!nonceRes.ok) {
        throw new Error(`Failed to fetch nonce: ${nonceRes.status}`);
      }
      const nonce = await nonceRes.text();
      console.log("[Base Auth] Nonce received:", nonce.substring(0, 10) + "...");

      console.log("[Base Auth] Requesting wallet connection...");
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
      }).catch((err: any) => {
        console.error("[Base Auth] Provider request failed:", err);
        throw new Error(
          err?.message?.includes("timeout") || err?.message?.includes("ERR_CONNECTION")
            ? "Network connection error. Please check your internet connection and try again."
            : "Wallet connection failed. Please try again or use email login."
        );
      });

      if (!resp) {
        throw new Error("No response from wallet provider");
      }

      const { accounts } = resp as { 
        accounts: Array<{ 
          address: string; 
          capabilities?: { 
            signInWithEthereum?: { 
              message: string; 
              signature: string 
            } 
          } 
        }> 
      };

      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet accounts found. Please ensure your wallet is unlocked.");
      }

      const { address } = accounts[0];
      const siweData = accounts[0].capabilities?.signInWithEthereum;

      if (!siweData?.message || !siweData?.signature) {
        throw new Error("Wallet failed to sign message. Please try again.");
      }

      const { message, signature } = siweData;
      console.log("[Base Auth] Message signed, verifying on backend...");

      const intent =
        mode === "signup_merchant" ? "signup_merchant" : "signin_customer";

      // TEMPORARY: Use local Base auth (Prisma commented out)
      console.log("[Base Auth] Using temporary local auth (Prisma disabled)");
      
      const baseUser = {
        id: address,
        email: `${address}@base.wallet`,
        name: `User ${address.slice(0, 6)}`,
        role: mode === "signup_merchant" ? "MERCHANT" : "CUSTOMER",
        address,
        createdAt: new Date().toISOString(),
      };

      // Generate temporary tokens
      const accessToken = btoa(JSON.stringify({ address, role: baseUser.role }));
      const refreshToken = btoa(JSON.stringify({ address, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));

      console.log("[Base Auth] Local auth successful!");

      // For merchant signup, show form
      if (mode === "signup_merchant") {
        setTempToken(accessToken);
        setShowMerchantForm(true);
        setLoading(false);
        return;
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(baseUser));

      if (baseUser.role === "MERCHANT") {
        router.push("/merchant");
      } else {
        router.push("/customer");
      }
      
      /* COMMENTED: Prisma API verification temporarily disabled
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, message, signature, intent }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = body?.error || `Verification failed: ${res.status}`;
        throw new Error(errorMsg);
      }
      */
    } catch (err) {
      console.error("[Base Auth] Error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      
      // Log specific error types for debugging
      if (errorMessage.includes("timeout") || errorMessage.includes("ERR_CONNECTION")) {
        console.error("[Base Auth] Network connectivity issue detected");
      }
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
      // TEMPORARY: Use local auth for merchant signup (Prisma commented out)
      console.log("[Base Auth] Processing merchant signup locally...");
      
      const merchantUser = {
        id: tempToken || "merchant_" + Date.now(),
        email: `merchant_${Date.now()}@base.wallet`,
        name: merchantForm.name,
        businessName: merchantForm.businessName,
        role: "MERCHANT",
        address: tempToken,
        createdAt: new Date().toISOString(),
      };

      // Generate persistent tokens
      const accessToken = btoa(JSON.stringify({ address: tempToken, role: "MERCHANT", businessName: merchantForm.businessName }));
      const refreshToken = btoa(JSON.stringify({ address: tempToken, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(merchantUser));

      console.log("[Base Auth] Merchant account created locally!");
      router.push("/merchant");
      
      /* COMMENTED: Prisma API temporarily disabled
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
      localStorage.setItem("access_token", body.accessToken);
      localStorage.setItem("refresh_token", body.refreshToken);
      localStorage.setItem("user", JSON.stringify(body.user));
      router.push("/merchant");
      */
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
            <button
              type="button"
              className={`button wallet-button ${loading ? "loading" : ""}`}
              onClick={() => signInWithBase()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Connecting...
                </>
              ) : (
                <>
                  <svg
                    className="button-icon"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M10.894 2.553a.961.961 0 00-1.788 0l-7 14a.961.961 0 001.784 1.447L5.286 15h5.428l.428 2.447a.961.961 0 001.784-1.447l-7-14zM6.803 13h6.394L10 5.819 6.803 13z" />
                  </svg>
                  Connect Base Wallet
                </>
              )}
            </button>
            
            {error && (
              <div className="error-message-detail">
                <p>Having trouble with wallet connection?</p>
                <button
                  type="button"
                  className="button-link"
                  onClick={() => {
                    setError("");
                    console.log("Wallet connection troubleshooting...");
                  }}
                >
                  View troubleshooting guide
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
