import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import { ValidationError } from "express-validator";

interface ApiValidationError extends AppError {
  errors?: ValidationError[];
}

// Central error handler middleware
export const errorHandler = (
  err: Error | AppError | ApiValidationError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default values
  let statusCode = 500;
  let status = "error";
  let message = "Something went wrong";
  let errors: any = undefined;
  let stack: string | undefined = undefined;

  // If it's our operational error, use its values
  if ("statusCode" in err) {
    statusCode = err.statusCode;
    status = err.status || "error";
    message = err.message;
    if ("errors" in err && err.errors) {
      errors = err.errors;
    }
  } else {
    // For non-operational errors, keep a generic message to the client
    // but log the real error
    message = "Something went wrong";
    logger.error(err.message, { stack: err.stack });
  }

  // Only include stack trace in development
  if (process.env.NODE_ENV === "development") {
    stack = err.stack;
  }

  // Handle specific error types

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    status = "fail";
    // Handle mongoose validation errors here if you use mongoose
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    status = "fail";
    message = "Invalid token. Please log in again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    status = "fail";
    message = "Your token has expired. Please log in again.";
  }

  // Stripe errors
  if (err.name === "StripeError") {
    statusCode = 400;
    status = "fail";
    message = err.message;
  }

  // Database errors
  if (err.name === "PostgresError" || err.name === "SupabaseError") {
    statusCode = 500;
    status = "error";
    message = "Database error occurred";
  }

  // Send response
  res.status(statusCode).json({
    status,
    message,
    ...(errors && { errors }),
    ...(stack && { stack }),
    ...(process.env.NODE_ENV === "development" && { detail: err.message }),
  });
};
