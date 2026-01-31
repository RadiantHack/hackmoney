const enums = {
  USER_NOT_FOUND: "user_not_found",
  EMAIL_IN_USE: "email_in_use",
  EMAIL_INVALID: "email_invalid",
  PASSWORD_INVALID: "password_invalid",
  PASSWORD_INCORRECT: "password_incorrect",
  UNAUTHENTICATED: "not_authenticated",
  NO_TOKEN_PROVIDED: "no_token_provided",
  UNAUTHORIZED: "unauthorized",
  PAYMENT_NOT_FOUND: "payment_not_found",
  PAYMENT_METHOD_NOT_SUPPORTED: "payment_method_not_supported",
  PAYMENT_REJECTED: "payment_rejected",
  PAYMENT_ALREADY_COMPLETED: "payment_already_completed",
  INVALID_REQUEST_BODY: "invalid_request_body",
  MERCHANT_NOT_FOUND: "merchant_not_found",
  CUSTOMER_NOT_FOUND: "customer_not_found",
  INSUFFICIENT_BALANCE: "insufficient_balance",
  UNEXPECTED_ERROR: "unexpected_error",
} as const;

export default enums;
export type Errors = typeof enums;
export type Error = Errors[keyof Errors];
