import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { verifyAccessToken, type TokenPayload } from "@openpay/backend";
// import { prisma } from "@openpay/backend";
import mockPrisma from "../mock/prisma";
const prisma = mockPrisma;
import { ErrorHandler, errors } from "@openpay/error-handler";
import { generateBinCardWithAtm } from "../services/stripe";

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Middleware to verify authentication
 */
const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      throw new ErrorHandler(errors.NO_TOKEN_PROVIDED);
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      throw new ErrorHandler(errors.UNAUTHENTICATED);
    }

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/customer/profile
 * get customer profile with card details
 */
router.get(
  "/profile",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw new ErrorHandler(errors.UNAUTHENTICATED);
      }
      const userId = authReq.user.userId;

      // Get user with customer details and cards
      let user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          customer: {
            include: {
              cards: true,
            },
          },
        },
      });

      if (!user) {
        throw new ErrorHandler(errors.USER_NOT_FOUND);
      }

      if (!user.customer && user.role === "CUSTOMER") {
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
        user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            customer: {
              include: {
                cards: true,
              },
            },
          },
        });
        if (!user?.customer) {
          throw new ErrorHandler(errors.USER_NOT_FOUND);
        }
      } else if (!user.customer) {
        throw new ErrorHandler(errors.USER_NOT_FOUND);
      }

      const primaryCard = user.customer.cards[0];

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        customer: {
          id: user.customer.id,
          cardLast4: primaryCard?.cardLast4,
          cardBrand: primaryCard?.cardBrand,
          cardExpMonth: primaryCard?.cardExpMonth,
          cardExpYear: primaryCard?.cardExpYear,
          cardStatus: primaryCard?.cardStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/customer/card
 * Get customer card details "with security ^_^"
 */
router.get(
  "/card",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw new ErrorHandler(errors.UNAUTHENTICATED);
      }
      const userId = authReq.user.userId;

      let customerWithCards = await prisma.customer.findFirst({
        where: { userId },
        include: {
          cards: true,
        },
      });

      if (!customerWithCards) {
        throw new ErrorHandler(errors.USER_NOT_FOUND);
      }

      // If customer has no cards (e.g. created via update-role before we added card creation), create one
      if (customerWithCards.cards.length === 0) {
        const binCard = await generateBinCardWithAtm();
        await prisma.card.create({
          data: {
            customerId: customerWithCards.id,
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
        customerWithCards = await prisma.customer.findFirst({
          where: { userId },
          include: { cards: true },
        });
      }

      const card = customerWithCards?.cards[0];
      if (!card) {
        throw new ErrorHandler(errors.USER_NOT_FOUND);
      }

      return res.json({
        card: {
          cardId: card.stripeCardId,
          cardNumber: card.cardNumber,
          cardBrand: card.cardBrand,
          cardLast4: card.cardLast4,
          cardExpMonth: card.cardExpMonth,
          cardExpYear: card.cardExpYear,
          cardCvv: card.cardCvv,
          cardStatus: card.cardStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
