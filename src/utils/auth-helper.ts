import jwt from 'jsonwebtoken';
import { AppError } from './appError';
import { logger } from './logger';

interface JwtPayload {
  sub: string;  // user ID
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

/**
 * Extracts user details from a JWT token
 * @param token JWT token string
 * @returns Object containing user details (id, email, role)
 * @throws AppError if token is invalid or expired
 */
export const getUserFromToken = (token: string): { 
  userId: string;
  email?: string; 
  role?: string;
} => {
  try {
    if (!token) {
      throw new AppError('Authentication required - no token provided', 401);
    }

    // Verify and decode the token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET as string
      ) as JwtPayload;
    } catch (jwtError) {
      // Handle specific JWT errors
      if ((jwtError as Error).name === 'TokenExpiredError') {
        throw new AppError('Authentication expired - please log in again', 401);
      } else if ((jwtError as Error).name === 'JsonWebTokenError') {
        throw new AppError('Invalid authentication token', 401);
      } else {
        throw new AppError('Authentication failed', 401);
      }
    }

    // Check if token is expired (redundant with verify, but keeping as a fallback)
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new AppError('Token expired', 401);
    }

    // Ensure user ID exists in the token
    if (!decoded.sub) {
      throw new AppError('Invalid token - missing user ID', 401);
    }

    return {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Error extracting user from token:', error);
    throw new AppError('Invalid token', 401);
  }
}; 