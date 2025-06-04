import { Request, Response, NextFunction } from "express";
import { extractJwtFromRequest } from "../utils/jwt";
import { AppError } from "../utils/appError";
import { getUserFromToken } from "../utils/auth-helper";
import { logger } from "../utils/logger";

// Extend the Express Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
      userRole?: string;
      jwt?: string;
    }
  }
}

/**
 * Helper function to validate JWT and extract user details
 * @param req Express request
 * @param requireAuth Whether authentication is required (true) or optional (false)
 * @returns User details object if JWT is valid, null if JWT is not present and not required
 * @throws AppError if JWT is required but invalid or missing
 */
const validateJwt = (req: Request, requireAuth: boolean = true) => {
  try {
    // Extract JWT from request
    const token = extractJwtFromRequest(req);
    
    if (!token) {
      if (requireAuth) {
        throw new AppError("Authentication required", 401);
      }
      return null;
    }
    
    // Verify and decode the token
    const userDetails = getUserFromToken(token);
    
    // Add user details to request
    req.jwt = token;
    req.userId = userDetails.userId;
    req.userRole = userDetails.role;
    
    return userDetails;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error("JWT validation error:", error);
    throw new AppError("Authentication failed", 401);
  }
};

// Middleware to protect routes - requires authentication
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate JWT and require authentication
    validateJwt(req, true);
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware for optional authentication
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate JWT but don't require authentication
    validateJwt(req, false);
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to restrict access to specific roles
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // First ensure user is authenticated
    if (!req.userId || !req.userRole) {
      return next(new AppError("Authentication required", 401));
    }

    // Then check if user has required role
    if (!roles.includes(req.userRole)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};
