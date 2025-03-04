import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/appError";
import { supabaseClient } from "../config/supabase";
import { logger } from "../utils/logger";

// Extend the Express Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
      userRole?: string;
    }
  }
}

// Middleware to protect routes - requires valid JWT
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Also check for token in cookies (for browser clients)
    else if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    // Check if token exists
    if (!token) {
      return next(
        new AppError("You are not logged in. Please log in to get access.", 401)
      );
    }

    // Verify token
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as any;

      // Check if the user still exists
      const { data: user, error } = await supabaseClient
        .from("users")
        .select("id, email, role")
        .eq("id", decoded.id)
        .single();

      if (error || !user) {
        return next(
          new AppError(
            "The user belonging to this token no longer exists.",
            401
          )
        );
      }

      // Add user info to request object
      req.user = user;
      req.userId = user.id;
      req.userRole = user.role;

      next();
    } catch (error) {
      return next(
        new AppError(
          "Invalid token or token has expired. Please log in again.",
          401
        )
      );
    }
  } catch (error) {
    logger.error("Error in auth middleware:", error);
    return next(new AppError("Authentication failed", 500));
  }
};

// Optional authentication middleware
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Also check for token in cookies
    else if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        ) as any;

        // Check if the user exists
        const { data: user, error } = await supabaseClient
          .from("users")
          .select("id, email, role")
          .eq("id", decoded.id)
          .single();

        if (!error && user) {
          // Add user info to request object
          req.user = user;
          req.userId = user.id;
          req.userRole = user.role;
        }
      } catch (error) {
        // Don't return error, just continue without auth
        console.log("Token verification failed, continuing as anonymous");
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// Middleware to restrict access to certain roles
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};
