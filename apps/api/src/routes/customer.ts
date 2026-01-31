import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { prisma, verifyAccessToken, type TokenPayload } from "@openpay/backend";
import { ErrorHandler, errors } from "@openpay/error-handler";

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

      // gte user with customer details and cards
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          customer: {
            include: {
              cards: true,
            },
          },
        },
      });

      if (!user || !user.customer) {
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

      const customerWithCards = await prisma.customer.findFirst({
        where: { userId },
        include: {
          cards: true,
        },
      });

      if (!customerWithCards || customerWithCards.cards.length === 0) {
        throw new ErrorHandler(errors.USER_NOT_FOUND);
      }

      const card = customerWithCards.cards[0];

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
