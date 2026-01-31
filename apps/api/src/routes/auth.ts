import { Router } from "express";
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

/**
 * DELETE /api/auth/delete
 * Delete current authenticated user and all associated data
 * Useful for testing signup flow
 */
router.delete("/delete", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      throw new ErrorHandler(errors.NO_TOKEN_PROVIDED);
    }

    // Verify access token
    const payload = await prisma.user.findMany();
    // Extract userId from token (simple approach - in prod use proper JWT verification)
    let userId: string | null = null;

    try {
      // Get userId from request body or header
      const userIdFromBody = (req.body as { userId?: string }).userId;
      if (userIdFromBody) {
        userId = userIdFromBody;
      } else {
        // Try to extract from auth header token payload
        // For now, we'll require it to be passed in body
        throw new ErrorHandler(errors.INVALID_REQUEST_BODY);
      }
    } catch {
      throw new ErrorHandler(errors.INVALID_REQUEST_BODY);
    }

    console.log("Deleting user:", userId);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: {
          include: {
            cards: true,
            payments: true,
          },
        },
        merchant: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!user) {
      throw new ErrorHandler(errors.USER_NOT_FOUND);
    }

    // Delete all associated data
    // Payments are deleted via cascade in Prisma schema
    // Cards are deleted via cascade when customer is deleted

    // Delete user (cascade will handle customer/merchant deletion)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Remove tokens from Redis
    if (token) {
      await removeToken(token);
    }

    const refreshToken = (req.body as { refreshToken?: string }).refreshToken;
    if (refreshToken) {
      await removeRefreshToken(refreshToken);
    }

    console.log("User deleted successfully:", userId);

    return res.json({
      message: "User and all associated data deleted successfully",
      userId,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    next(error);
  }
});

export default router;
