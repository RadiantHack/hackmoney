// import { prisma } from "@openpay/backend";
import mockPrisma from "../mock/prisma";
const prisma = mockPrisma;
import crypto from "crypto";

interface CardTapValidation {
  isValid: boolean;
  error?: string;
  card?: any;
}

interface PaymentProcessingResult {
  id: string;
  merchantId: string;
  customerId: string | null;
  amount: string;
  currency: string;
  status: string;
  transactionId: string;
  createdAt: Date;
}

/**
 * Validate card tap data
 * Checks if the card exists and is active
 */
export async function validateCardTap({
  cardNumber,
  cardCvv,
}: {
  cardNumber: string;
  cardCvv?: string;
}): Promise<CardTapValidation> {
  try {
    // Find card by number
    const card = await prisma.card.findUnique({
      where: { cardNumber },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!card) {
      return {
        isValid: false,
        error: "Card not found",
      };
    }

    // Check card status
    if (card.cardStatus !== "ACTIVE") {
      return {
        isValid: false,
        error: `Card is ${card.cardStatus.toLowerCase()}`,
      };
    }

    // Verify CVV if provided
    if (cardCvv && card.cardCvv !== cardCvv) {
      return {
        isValid: false,
        error: "Invalid CVV",
      };
    }

    // Check card expiration
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (
      card.cardExpYear < currentYear ||
      (card.cardExpYear === currentYear && card.cardExpMonth < currentMonth)
    ) {
      return {
        isValid: false,
        error: "Card has expired",
      };
    }

    return {
      isValid: true,
      card,
    };
  } catch (error) {
    console.error("Card validation error:", error);
    return {
      isValid: false,
      error: "Card validation failed",
    };
  }
}

/**
 * Process a card tap payment
 * This simulates the payment processing that would happen when a card is tapped at a terminal
 */
export async function processCardTapPayment({
  merchantId,
  cardNumber,
  cardCvv,
  amount,
  currency = "USD",
  description,
  terminalId,
}: {
  merchantId: string;
  cardNumber: string;
  cardCvv?: string;
  amount: number;
  currency?: string;
  description?: string;
  terminalId?: string;
}): Promise<PaymentProcessingResult> {
  console.log(`[Payment] Processing card tap payment for merchant ${merchantId}`);
  console.log(`[Payment] Amount: ${amount} ${currency}`);
  console.log(`[Payment] Terminal: ${terminalId || "N/A"}`);

  // Validate the card
  const validation = await validateCardTap({ cardNumber, cardCvv });
  if (!validation.isValid || !validation.card) {
    throw new Error(validation.error || "Card validation failed");
  }

  const card = validation.card;

  // Generate a unique transaction ID
  const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;

  console.log(`[Payment] Transaction ID: ${transactionId}`);
  console.log(`[Payment] Customer ID: ${card.customerId}`);

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      merchantId,
      customerId: card.customerId,
      amount,
      currency,
      status: "COMPLETED", // In production, this would be PENDING initially
    },
  });

  console.log(`[Payment] Payment created: ${payment.id}`);

  // In a real implementation, you would:
  // 1. Check customer's balance or credit limit
  // 2. Process the payment through a payment processor (Stripe, etc.)
  // 3. Update the payment status based on the result
  // 4. Send notifications to customer and merchant
  // 5. Update merchant's balance

  return {
    id: payment.id,
    merchantId: payment.merchantId,
    customerId: payment.customerId,
    amount: payment.amount.toString(),
    currency: payment.currency,
    status: payment.status,
    transactionId,
    createdAt: payment.createdAt,
  };
}

/**
 * Process an NFC card tap payment
 * This would integrate with blockchain for NFC cards (like ethglobal-london-app)
 */
export async function processNfcTapPayment({
  merchantId,
  nfcSerialNumber,
  nfcCardHash,
  amount,
  currency = "USD",
  description,
  terminalId,
}: {
  merchantId: string;
  nfcSerialNumber: string;
  nfcCardHash?: string;
  amount: number;
  currency?: string;
  description?: string;
  terminalId?: string;
}): Promise<any> {
  console.log(`[NFC Payment] Processing NFC tap payment for merchant ${merchantId}`);
  console.log(`[NFC Payment] Serial Number: ${nfcSerialNumber}`);
  console.log(`[NFC Payment] Amount: ${amount} ${currency}`);

  // TODO: Implement blockchain integration
  // This would:
  // 1. Get card hash from serial number (if not provided)
  // 2. Get card address from CardManager contract
  // 3. Check balance on blockchain
  // 4. Prepare withdrawal transaction
  // 5. Submit user operation via bundler
  // 6. Wait for transaction confirmation
  // 7. Create payment record in database

  // For now, just create a payment record
  const payment = await prisma.payment.create({
    data: {
      merchantId,
      customerId: null, // NFC cards might not have customer records
      amount,
      currency,
      status: "PENDING",
    },
  });

  return {
    id: payment.id,
    merchantId: payment.merchantId,
    amount: payment.amount.toString(),
    currency: payment.currency,
    status: payment.status,
    nfcSerialNumber,
    createdAt: payment.createdAt,
  };
}

/**
 * Get payment statistics for a merchant
 */
export async function getMerchantPaymentStats(merchantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const [totalPayments, todayPayments, monthPayments, totalRevenue] =
    await Promise.all([
      prisma.payment.count({
        where: { merchantId, status: "COMPLETED" },
      }),
      prisma.payment.count({
        where: {
          merchantId,
          status: "COMPLETED",
          createdAt: { gte: today },
        },
      }),
      prisma.payment.count({
        where: {
          merchantId,
          status: "COMPLETED",
          createdAt: { gte: thisMonth },
        },
      }),
      prisma.payment.aggregate({
        where: { merchantId, status: "COMPLETED" },
        _sum: { amount: true },
      }),
    ]);

  return {
    totalPayments,
    todayPayments,
    monthPayments,
    totalRevenue: totalRevenue._sum.amount?.toString() || "0",
  };
}
