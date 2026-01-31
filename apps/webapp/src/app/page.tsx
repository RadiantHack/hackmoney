"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { log } from "@openpay/logger";
import "./auth.css";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [userType, setUserType] = useState<"CUSTOMER" | "MERCHANT">("CUSTOMER");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    businessName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  log("OpenPay Portal");

  useEffect(() => {
    setError("");
    setFieldErrors({});
  }, [mode, userType]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "email":
        if (!value) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Please enter a valid email";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (mode === "signup" && value.length < 6)
          return "Password must be at least 6 characters";
        return "";
      case "name":
        if (mode === "signup" && !value) return "Name is required";
        return "";
      case "businessName":
        if (mode === "signup" && userType === "MERCHANT" && !value)
          return "Business name is required";
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (fieldName: string) => {
    setTouched({ ...touched, [fieldName]: true });
    const value = formData[fieldName as keyof typeof formData];
    const error = validateField(fieldName, value || "");
    setFieldErrors({ ...fieldErrors, [fieldName]: error });
  };

  const handleChange = (fieldName: string, value: string) => {
    setFormData({ ...formData, [fieldName]: value });
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setFieldErrors({ ...fieldErrors, [fieldName]: error });
    }
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate all fields
    const errors: Record<string, string> = {};
    Object.keys(formData).forEach((key) => {
      if (mode === "signin" && (key === "name" || key === "businessName"))
        return;
      if (
        mode === "signup" &&
        userType === "CUSTOMER" &&
        key === "businessName"
      )
        return;
      const error = validateField(
        key,
        formData[key as keyof typeof formData] || ""
      );
      if (error) errors[key] = error;
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouched(
        Object.keys(formData).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        )
      );
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const response = await fetch(`http://localhost:5001${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          ...(mode === "signup" && { role: userType }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.description ||
            `${mode === "signup" ? "Signup" : "Sign in"} failed`
        );
      }

      // Store tokens
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirect to dashboard
      if (userType === "CUSTOMER") {
        router.push("/customer");
      } else {
        router.push("/merchant");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="hero-section">
        <h1 className="title">
          OpenPay
          <span className="title-accent"> Payment Platform</span>
        </h1>
        <p className="description">
          Welcome to OpenPay. Make secure payments as a customer or manage your
          business as a merchant.
        </p>
      </div>

      <div className="form-wrapper">
        <div className="tabs">
          <button
            type="button"
            className={`tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            aria-selected={mode === "signup"}
          >
            Sign Up
          </button>
          <button
            type="button"
            className={`tab ${mode === "signin" ? "active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            aria-selected={mode === "signin"}
          >
            Sign In
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

        <form onSubmit={handleSubmit} className="form" noValidate>
          {mode === "signup" && (
            <>
              <div className="form-group">
                <label htmlFor="userType">I am a</label>
                <div className="select-wrapper">
                  <select
                    id="userType"
                    value={userType}
                    onChange={(e) =>
                      setUserType(e.target.value as "CUSTOMER" | "MERCHANT")
                    }
                    className="select-input"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="MERCHANT">Merchant</option>
                  </select>
                  <svg
                    className="select-arrow"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="name">
                  {userType === "MERCHANT" ? "Your Name" : "Name"}
                </label>
                <div className="input-wrapper">
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    onBlur={() => handleBlur("name")}
                    placeholder={
                      userType === "MERCHANT" ? "Your name" : "Your name"
                    }
                    className={
                      touched.name && fieldErrors.name ? "input-error" : ""
                    }
                    aria-invalid={touched.name && !!fieldErrors.name}
                    aria-describedby={
                      touched.name && fieldErrors.name
                        ? "name-error"
                        : undefined
                    }
                  />
                  {touched.name && fieldErrors.name && (
                    <span id="name-error" className="field-error">
                      {fieldErrors.name}
                    </span>
                  )}
                </div>
              </div>

              {userType === "MERCHANT" && (
                <div
                  className="form-group"
                  style={{
                    animation: "slideDown 0.3s ease-out",
                  }}
                >
                  <label htmlFor="businessName">Business Name</label>
                  <div className="input-wrapper">
                    <input
                      id="businessName"
                      type="text"
                      value={formData.businessName}
                      onChange={(e) =>
                        handleChange("businessName", e.target.value)
                      }
                      onBlur={() => handleBlur("businessName")}
                      placeholder="Your business name"
                      className={
                        touched.businessName && fieldErrors.businessName
                          ? "input-error"
                          : ""
                      }
                      aria-invalid={
                        touched.businessName && !!fieldErrors.businessName
                      }
                      aria-describedby={
                        touched.businessName && fieldErrors.businessName
                          ? "businessName-error"
                          : undefined
                      }
                    />
                    {touched.businessName && fieldErrors.businessName && (
                      <span id="businessName-error" className="field-error">
                        {fieldErrors.businessName}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="your@email.com"
                className={
                  touched.email && fieldErrors.email ? "input-error" : ""
                }
                aria-invalid={touched.email && !!fieldErrors.email}
                aria-describedby={
                  touched.email && fieldErrors.email ? "email-error" : undefined
                }
                required
              />
              {touched.email && fieldErrors.email && (
                <span id="email-error" className="field-error">
                  {fieldErrors.email}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                placeholder="••••••••"
                className={
                  touched.password && fieldErrors.password ? "input-error" : ""
                }
                aria-invalid={touched.password && !!fieldErrors.password}
                aria-describedby={
                  touched.password && fieldErrors.password
                    ? "password-error"
                    : undefined
                }
                required
                minLength={mode === "signup" ? 6 : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.966 9.966 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
              {touched.password && fieldErrors.password && (
                <span id="password-error" className="field-error">
                  {fieldErrors.password}
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
                {mode === "signup" ? "Signing up..." : "Signing in..."}
              </>
            ) : (
              <>
                {mode === "signup" ? "Sign Up" : "Sign In"}
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
      </div>
    </div>
  );
}
