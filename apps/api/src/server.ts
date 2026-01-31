import { json, urlencoded } from "body-parser";
import express, { type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import { prisma } from "@openpay/backend";
import authRoutes from "./routes/auth";
import customerRoutes from "./routes/customer";
import { errorHandlerMiddleware } from "./middleware/errorHandler";

export const createServer = (): Express => {
  const app = express();
  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(urlencoded({ extended: true }))
    .use(json())
    .use((req, res, next) => {
      console.log("Request body:", req.body);
      next();
    })
    .use(cors())
    .get("/health", (_, res) => {
      return res.json({ status: "ok", service: "openpay-api" });
    })
    .use("/api/auth", authRoutes)
    .use("/api/customer", customerRoutes)
    .get("/api/payments", async (req, res) => {
      try {
        const payments = await prisma.payment.findMany({
          include: {
            merchant: true,
            customer: true,
          },
        });
        return res.json({ payments });
      } catch {
        return res.status(500).json({ error: "Failed to fetch payments" });
      }
    })
    .use(errorHandlerMiddleware);

  return app;
};
