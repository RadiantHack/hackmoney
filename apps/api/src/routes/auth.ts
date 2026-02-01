import { Router } from "express";
import crypto from "crypto";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import bcrypt from "bcrypt";
import { prisma } from "@openpay/backend";
import {
  storeToken,
  storeRefreshToken,
  removeToken,
  removeRefreshToken,
} from "@openpay/backend";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
  generateMerchantSignupTempToken,
  verifyMerchantSignupTempToken,
} from "@openpay/backend";
import type { TokenPayload } from "@openpay/backend";
import { errors, ErrorHandler } from "@openpay/error-handler";
import { generateBinCardWithAtm } from "../services/stripe";

const router = Router();

interface SignupBody {
  email: string;
  password: string;
  name?: string;
  role?: "CUSTOMER" | "MERCHANT";
  businessName?: string;
}

interface SigninBody {
  email: string;
  password: string;
}

/**
 * POST /api/auth/signup
 * Sign up a new user (customer or merchant)
 */
router.post("/signup", async (req, res, next) => {
  try {
    const {
      email,
      password,
      name,
      role = "CUSTOMER",
      businessName,
    }: SignupBody = req.body;

    if (!email || !password) {
      throw new ErrorHandler(errors.INVALID_REQUEST_BODY);
    }

    // Check if user already exists
    // DEBUG
    // console.log("Checking if user exists:", email);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ErrorHandler(errors.EMAIL_IN_USE);
    }

    // Hash password
    // DEBUG
    // console.log("Hashing password");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    // DEBUG
    // console.log("Creating user:", email);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });
    // DEBUG
    // console.log("User created:", user.id);

    // Create customer or merchant profile
    if (role === "MERCHANT") {
      if (!businessName) {
        throw new ErrorHandler(errors.INVALID_REQUEST_BODY);
      }
      console.log("Creating merchant profile");
      await prisma.merchant.create({
        data: {
          userId: user.id,
          businessName,
        },
      });
    } else {
      console.log("Creating customer profile");

      // Create customer record without Stripe
      const customer = await prisma.customer.create({
        data: {
          userId: user.id,
        },
      });

      // Generate BIN card with ATM number type
      console.log("Generating BIN card with ATM type");
      const binCard = await generateBinCardWithAtm();

      // Store card in database
      await prisma.card.create({
        data: {
          customerId: customer.id,
          cardNumber: binCard.cardNumber,
          cardLast4: binCard.cardLast4,
          cardBrand: binCard.cardBrand,
          cardExpMonth: binCard.cardExpMonth,
          cardExpYear: binCard.cardExpYear,
          cardCvv: binCard.cardCvv,
          cardPin: binCard.cardPin,
          stripeCardId: binCard.cardId,
        },
      });

      console.log(
        `BIN card generated successfully for customer ${customer.id}`
      );
    }
    console.log("Profile created");

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    console.log("Generating tokens");
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store tokens in Redis
    console.log("Storing tokens in Redis");
    await storeToken(accessToken, user.id, 3600); // 1 hour
    await storeRefreshToken(refreshToken, user.id, 604800); // 7 days
    console.log("Tokens stored");

    // If customer, fetch card details to return
    let cardDetails = null;
    if (role === "CUSTOMER") {
      const card = await prisma.card.findFirst({
        where: {
          customer: {
            userId: user.id,
          },
        },
        select: {
          id: true,
          cardLast4: true,
          cardBrand: true,
          cardExpMonth: true,
          cardExpYear: true,
          cardStatus: true,
        },
      });
      cardDetails = card;
    }

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      card: cardDetails,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Signup error:", error);
    next(error);
  }
});

/**
 * POST /api/auth/signin
 * Sign in an existing user
 */
router.post("/signin", async (req, res, next) => {
  try {
    const { email, password }: SigninBody = req.body;

    if (!email || !password) {
      throw new ErrorHandler(errors.INVALID_REQUEST_BODY);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ErrorHandler(errors.USER_NOT_FOUND);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new ErrorHandler(errors.PASSWORD_INCORRECT);
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store tokens in Redis
    await storeToken(accessToken, user.id, 3600); // 1 hour
    await storeRefreshToken(refreshToken, user.id, 604800); // 7 days

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/signout
 * Sign out user (remove tokens)
 */
router.post("/signout", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      await removeToken(token);
    }

    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      await removeRefreshToken(refreshToken);
    }

    return res.json({ message: "Signed out successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ErrorHandler(errors.NO_TOKEN_PROVIDED);
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new ErrorHandler(errors.UNAUTHENTICATED);
    }

    // Check if refresh token exists in Redis
    const userId = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!userId) {
      throw new ErrorHandler(errors.USER_NOT_FOUND);
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(payload);

    // Store new access token in Redis
    await storeToken(newAccessToken, payload.userId, 3600);

    return res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

const client = createPublicClient({ chain: base, transport: http() });

const issuedNonces = new Map<string, number>();
const usedNonces = new Set<string>();

// Nonce expiry time (5 minutes)
const NONCE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * GET /api/auth/nonce
 * Issue a fresh nonce for the client to include in their sign-in message
 */
router.get("/nonce", async (_, res) => {
  const nonce = crypto.randomBytes(16).toString("hex");
  issuedNonces.set(nonce, Date.now());

  // Clean up expired nonces
  const now = Date.now();
  for (const [n, createdAt] of Array.from(issuedNonces.entries())) {
    if (now - createdAt > NONCE_EXPIRY_MS) {
      issuedNonces.delete(n);
    }
  }

  console.log("[Nonce] Issued new nonce:", nonce);
  console.log("[Nonce] Active nonces:", Array.from(issuedNonces.keys()));

  res.send(nonce);
});

function extractNonceFromMessage(message: string): string | null {
  console.log("Full message received:\n", message);

  // Standard SIWE format: "Nonce: <nonce>"
  const siweMatch = message.match(/Nonce:\s*([a-zA-Z0-9]+)/i);
  if (siweMatch) {
    console.log("Extracted nonce (SIWE format):", siweMatch[1]);
    return siweMatch[1];
  }

  const hexMatch = message.match(/\b([0-9a-fA-F]{32})\b/);
  if (hexMatch) {
    console.log("Extracted nonce (hex format):", hexMatch[1]);
    return hexMatch[1];
  }

  console.log("Could not extract nonce from message");
  return null;
}

/**
 * POST /api/auth/verify
 * Verify address, message and signature using viem.
 * Optional intent: "signin_customer" (only existing customers) | "signup_merchant" (new merchants only).
 */
router.post("/verify", async (req, res) => {
  try {
    const { address, message, signature, intent } = req.body || {};

    console.log("Received request:");
    console.log("Address:", address);
    console.log("Intent:", intent);
    console.log("Signature:", signature?.substring(0, 20) + "...");

    if (!address || !message || !signature) {
      return res.status(400).json({ error: "Missing params" });
    }

    // Extract nonce from message
    const nonce = extractNonceFromMessage(message);

    if (!nonce) {
      return res
        .status(400)
        .json({ error: "Invalid message format (nonce not found)" });
    }

    console.log("Looking for nonce in issuedNonces:", nonce);
    console.log("Current issued nonces:", Array.from(issuedNonces.keys()));
    console.log("Used nonces:", Array.from(usedNonces));

    // Check if nonce was issued and not used
    if (!issuedNonces.has(nonce)) {
      console.log("Nonce not found in issuedNonces");
      return res
        .status(400)
        .json({ error: "Invalid nonce (not issued by server)" });
    }

    if (usedNonces.has(nonce)) {
      console.log("Nonce already used");
      return res.status(400).json({ error: "Nonce already used" });
    }

    // Check if nonce is expired
    const nonceCreatedAt = issuedNonces.get(nonce);
    if (nonceCreatedAt && Date.now() - nonceCreatedAt > NONCE_EXPIRY_MS) {
      issuedNonces.delete(nonce);
      console.log("Nonce expired");
      return res.status(400).json({ error: "Nonce expired" });
    }

    // Verify the signature
    console.log("Verifying signature...");
    const valid = await client.verifyMessage({ address, message, signature });

    if (!valid) {
      console.log("Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Mark nonce as used
    usedNonces.add(nonce);
    issuedNonces.delete(nonce);

    console.log("Success! Address verified:", address);

    const existingUser = await prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (intent === "signin_customer") {
      if (!existingUser) {
        return res.status(404).json({
          error:
            "No customer account for this wallet. Sign up as merchant to create an account.",
        });
      }
      if (existingUser.role !== "CUSTOMER") {
        return res.status(400).json({
          error:
            "This wallet is registered as a merchant. Use merchant sign-in or a customer wallet.",
        });
      }
      const tokenPayload: TokenPayload = {
        userId: existingUser.id,
        email: existingUser.email || "",
        role: existingUser.role,
      };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      await storeToken(accessToken, existingUser.id, 3600);
      await storeRefreshToken(refreshToken, existingUser.id, 604800);
      return res.json({
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
          walletAddress: existingUser.walletAddress,
        },
        accessToken,
        refreshToken,
      });
    }

    if (intent === "signup_merchant") {
      if (existingUser) {
        return res.status(400).json({
          error:
            "Wallet already registered. Sign in as customer or use a different wallet.",
        });
      }
      const tempToken = generateMerchantSignupTempToken(address);
      return res.json({ needsMerchantDetails: true, tempToken });
    }

    let user = existingUser;

    if (!user) {
      console.log("Creating new user for address:", address);

      const placeholderEmail = `${address.toLowerCase()}+wallet@liquidcard.local`;

      // Generate a random password hash to satisfy schema requirements
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          walletAddress: address,
          email: placeholderEmail,
          password: hashedPassword,
          role: "CUSTOMER",
        },
      });
      console.log("User created:", user.id);

      const customer = await prisma.customer.create({
        data: { userId: user.id },
      });
      const binCard = await generateBinCardWithAtm();
      await prisma.card.create({
        data: {
          customerId: customer.id,
          cardNumber: binCard.cardNumber,
          cardLast4: binCard.cardLast4,
          cardBrand: binCard.cardBrand,
          cardExpMonth: binCard.cardExpMonth,
          cardExpYear: binCard.cardExpYear,
          cardCvv: binCard.cardCvv,
          cardPin: binCard.cardPin,
          stripeCardId: binCard.cardId,
        },
      });
      console.log("Customer and card created for wallet user:", user.id);
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email || "",
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store tokens in Redis
    await storeToken(accessToken, user.id, 3600); // 1 hour
    await storeRefreshToken(refreshToken, user.id, 604800); // 7 days

    console.log("Tokens generated and stored");

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/auth/complete-merchant-signup
 * Complete merchant signup with name and business name (after wallet verify + tempToken).
 */
router.post("/complete-merchant-signup", async (req, res) => {
  try {
    const { tempToken, name, businessName } = req.body || {};

    if (!tempToken || !name || !businessName) {
      return res.status(400).json({
        error: "Missing required fields: tempToken, name, businessName",
      });
    }

    const payload = verifyMerchantSignupTempToken(tempToken);
    if (!payload) {
      return res
        .status(400)
        .json({
          error: "Invalid or expired signup link. Please start sign up again.",
        });
    }

    const { address } = payload;

    const existingUser = await prisma.user.findUnique({
      where: { walletAddress: address },
    });
    if (existingUser) {
      return res.status(400).json({ error: "Wallet already registered." });
    }

    const placeholderEmail = `${address.toLowerCase()}+wallet@liquidcard.local`;
    const randomPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const user = await prisma.user.create({
      data: {
        walletAddress: address,
        email: placeholderEmail,
        password: hashedPassword,
        name,
        role: "MERCHANT",
      },
    });

    await prisma.merchant.create({
      data: {
        userId: user.id,
        businessName,
      },
    });

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email || "",
      role: user.role,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    await storeToken(accessToken, user.id, 3600);
    await storeRefreshToken(refreshToken, user.id, 604800);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Complete merchant signup error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/auth/update-role
 * Update user role (CUSTOMER or MERCHANT)
 */
router.post("/update-role", async (req, res, next) => {
  try {
    const { role } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      throw new ErrorHandler(errors.NO_TOKEN_PROVIDED);
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      throw new ErrorHandler(errors.UNAUTHENTICATED);
    }

    if (!role || !["CUSTOMER", "MERCHANT"].includes(role)) {
      throw new ErrorHandler(errors.INVALID_REQUEST_BODY);
    }

    // Update user role
    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: { role },
    });

    // If merchant, create merchant profile
    if (role === "MERCHANT") {
      const existingMerchant = await prisma.merchant.findUnique({
        where: { userId: user.id },
      });
      if (!existingMerchant) {
        await prisma.merchant.create({
          data: {
            userId: user.id,
            businessName: "New Business",
          },
        });
      }
    }

    // If customer, create customer profile and card when missing
    if (role === "CUSTOMER") {
      const existingCustomer = await prisma.customer.findUnique({
        where: { userId: user.id },
        include: { cards: true },
      });
      if (!existingCustomer) {
        const customer = await prisma.customer.create({
          data: { userId: user.id },
        });
        const binCard = await generateBinCardWithAtm();
        await prisma.card.create({
          data: {
            customerId: customer.id,
            cardNumber: binCard.cardNumber,
            cardLast4: binCard.cardLast4,
            cardBrand: binCard.cardBrand,
            cardExpMonth: binCard.cardExpMonth,
            cardExpYear: binCard.cardExpYear,
            cardCvv: binCard.cardCvv,
            cardPin: binCard.cardPin,
            stripeCardId: binCard.cardId,
          },
        });
      }
    }

    return res.json({ success: true, role: user.role });
  } catch (error) {
    next(error);
  }
});
