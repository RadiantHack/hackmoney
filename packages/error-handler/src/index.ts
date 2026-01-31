import errors, { type Error } from "./enum.js";
import { HttpStatus, type StatusCode } from "./httpStatus.js";

export default errors;
export * from "./enum.js";
export { errors };

type ErrorMapType = Record<
  Error,
  {
    code: StatusCode;
    description: string;
    headers: object;
  }
>;

export const errorData: ErrorMapType = {
  [errors.USER_NOT_FOUND]: {
    code: HttpStatus.NOT_FOUND,
    description: "User not found",
    headers: {},
  },
  [errors.EMAIL_IN_USE]: {
    code: HttpStatus.BAD_REQUEST,
    description: "Email is already used by a different account",
    headers: {},
  },
  [errors.EMAIL_INVALID]: {
    code: HttpStatus.BAD_REQUEST,
    description: "Email not valid",
    headers: {},
  },
  [errors.PASSWORD_INVALID]: {
    code: HttpStatus.BAD_REQUEST,
    description: "Password is not valid",
    headers: {},
  },
  [errors.PASSWORD_INCORRECT]: {
    code: HttpStatus.BAD_REQUEST,
    description: "Password incorrect",
    headers: {},
  },
  [errors.UNAUTHENTICATED]: {
    code: HttpStatus.UNAUTHORIZED,
    description: "Not authenticated",
    headers: {},
  },
  [errors.NO_TOKEN_PROVIDED]: {
    code: HttpStatus.FORBIDDEN,
    description: "No token provided",
    headers: {},
  },
  [errors.UNAUTHORIZED]: {
    code: HttpStatus.UNAUTHORIZED,
    description: "Unauthorized",
    headers: {},
  },
  [errors.PAYMENT_NOT_FOUND]: {
    code: HttpStatus.NOT_FOUND,
    description: "Payment not found",
    headers: {},
  },
  [errors.PAYMENT_METHOD_NOT_SUPPORTED]: {
    code: HttpStatus.BAD_REQUEST,
    description: "Payment method not supported",
    headers: {},
  },
  [errors.PAYMENT_REJECTED]: {
    code: HttpStatus.BAD_REQUEST,
    description: "Payment rejected",
    headers: {},
  },
  [errors.PAYMENT_ALREADY_COMPLETED]: {
    code: HttpStatus.BAD_REQUEST,
    description: "Payment already completed",
    headers: {},
  },
  [errors.INVALID_REQUEST_BODY]: {
    code: HttpStatus.BAD_REQUEST,
    description: "The request body is incorrect",
    headers: {},
  },
  [errors.MERCHANT_NOT_FOUND]: {
    code: HttpStatus.NOT_FOUND,
    description: "Merchant not found",
    headers: {},
  },
  [errors.CUSTOMER_NOT_FOUND]: {
    code: HttpStatus.NOT_FOUND,
    description: "Customer not found",
    headers: {},
  },
  [errors.INSUFFICIENT_BALANCE]: {
    code: HttpStatus.BAD_REQUEST,
    description: "Insufficient balance",
    headers: {},
  },
  [errors.UNEXPECTED_ERROR]: {
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "Unexpected internal error",
    headers: {},
  },
};

export type CustomError = {
  additionalFields: object;
  description: string;
  statusCode: StatusCode;
} & Error;

export class ErrorHandler extends Error {
  additionalFields: object;
  description: string;
  statusCode: StatusCode;

  constructor(message: Error, additionalFields = {}) {
    super(message);
    const errorInfo = errorData[message];
    if (!errorInfo) {
      console.error("Error definition not found for:", message, "Available keys:", Object.keys(errorData));
      throw new Error(`Error definition not found for: ${message}`);
    }
    this.statusCode = errorInfo.code;
    this.description = errorInfo.description;
    this.additionalFields = additionalFields;
    Object.setPrototypeOf(this, ErrorHandler.prototype);
  }
}
