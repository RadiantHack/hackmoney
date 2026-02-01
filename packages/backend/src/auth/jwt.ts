import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "your-refresh-secret-key-change-in-production";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify JWT refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export interface MerchantSignupTempPayload {
  address: string;
  purpose: "merchant_signup";
}

/**
 * Generate short-lived temp token for completing merchant signup (5 min)
 */
export function generateMerchantSignupTempToken(
  address: string
): string {
  return jwt.sign(
    { address, purpose: "merchant_signup" as const },
    JWT_SECRET,
    { expiresIn: "5m" }
  );
}

/**
 * Verify temp token for merchant signup
 */
export function verifyMerchantSignupTempToken(
  token: string
): MerchantSignupTempPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as MerchantSignupTempPayload;
    if (payload.purpose !== "merchant_signup" || !payload.address) return null;
    return payload;
  } catch {
    return null;
  }
}
