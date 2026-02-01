import { Router } from "express";
// import { prisma } from "@openpay/backend";
import mockPrisma from "../mock/prisma";
const prisma = mockPrisma;
import { verifyAccessToken } from "@openpay/backend";
import { errors, ErrorHandler } from "@openpay/error-handler";
import { processCardTapPayment, validateCardTap } from "../services/payment";

const router = Router();

/**
 * POST /api/merchant/payment/tap
 * Process a card tap payment at merchant terminal
 * This endpoint is called when a customer taps their card at a retail shop
 */
router.post("/payment/tap", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new ErrorHandler(errors.MISSING_AUTH_HEADER);
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    // Verify merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: payload.userId },
      include: { user: true },
    });

    if (!merchant) {
      throw new ErrorHandler(errors.UNAUTHORIZED);
    }

    const {
      cardNumber,
      cardCvv,
      amount,
      currency = "USD",
      description,
      terminalId,
    } = req.body;

    if (!cardNumber || !amount) {
      throw new ErrorHandler(errors.INVALID_REQUEST_BODY);
    }

    // Validate card tap data
    const cardValidation = await validateCardTap({
      cardNumber,
      cardCvv,
    });

    if (!cardValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: cardValidation.error,
      });
    }

    // Process the payment
    const paymentResult = await processCardTapPayment({
      merchantId: merchant.id,
      cardNumber,
      cardCvv,
      amount: parseFloat(amount),
      currency,
      description: description || "Card tap payment",
      terminalId,
    });

    return res.json({
      success: true,
      payment: paymentResult,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/merchant/payment/nfc-tap
 * Process an NFC card tap payment (for physical NFC cards)
 * This endpoint handles NFC tags like the ethglobal-london-app
 */
router.post("/payment/nfc-tap", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new ErrorHandler(errors.MISSING_AUTH_HEADER);
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    // Verify merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: payload.userId },
      include: { user: true },
    });

    if (!merchant) {
      throw new ErrorHandler(errors.UNAUTHORIZED);
    }

    const {
      nfcSerialNumber,
      nfcCardHash,
      amount,
      currency = "USD",
      description,
      terminalId,
      itemName,
    } = req.body;

    if (!nfcSerialNumber || !amount) {
      throw new ErrorHandler(errors.INVALID_REQUEST_BODY);
    }

    // TODO: Integrate with blockchain for NFC card processing
    // This would call the CardManager contract's withdraw method
    // Similar to the ethglobal-london-app implementation

    return res.json({
      success: true,
      message: "NFC payment processing initiated",
      nfcSerialNumber,
      amount,
      description: description || itemName || "NFC card payment",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/merchant/payments
 * Get all payments for a merchant
 */
router.get("/payments", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new ErrorHandler(errors.MISSING_AUTH_HEADER);
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    const merchant = await prisma.merchant.findUnique({
      where: { userId: payload.userId },
    });

    if (!merchant) {
      throw new ErrorHandler(errors.UNAUTHORIZED);
    }

    const { status, limit = "50", offset = "0" } = req.query;

    const whereClause: any = { merchantId: merchant.id };
    if (status) {
      whereClause.status = status;
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const totalPayments = await prisma.payment.count({
      where: whereClause,
    });

    return res.json({
      success: true,
      payments,
      pagination: {
        total: totalPayments,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/merchant/terminal/register
 * Register a new payment terminal for the merchant
 */
router.post("/terminal/register", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new ErrorHandler(errors.MISSING_AUTH_HEADER);
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    const merchant = await prisma.merchant.findUnique({
      where: { userId: payload.userId },
    });

    if (!merchant) {
      throw new ErrorHandler(errors.UNAUTHORIZED);
    }

    const { terminalName, location } = req.body;

    // Generate a unique terminal ID
    const terminalId = `TERM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In a real implementation, you would store this in a Terminal model
    // For now, we'll just return the terminal info
    return res.json({
      success: true,
      terminal: {
        id: terminalId,
        merchantId: merchant.id,
        name: terminalName || "Payment Terminal",
        location: location || "Store",
        status: "ACTIVE",
        createdAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
