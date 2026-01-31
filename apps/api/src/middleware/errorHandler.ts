import { type Request, type Response, type NextFunction } from "express";
import { ErrorHandler } from "@openpay/error-handler";

export function errorHandlerMiddleware(
  err: Error | ErrorHandler,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof ErrorHandler) {
    res.status(err.statusCode).json({
      error: err.message,
      description: err.description,
      ...err.additionalFields,
    });
  } else {
    console.error("Unexpected error in route:", req.path, {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).json({
      error: "unexpected_error",
      description: "An unexpected error occurred",
      errorMessage: err.message,
      errorStack: err.stack,
    });
  }
}
