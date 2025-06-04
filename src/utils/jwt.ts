import { Request } from 'express';

/**
 * Extracts JWT token from the request
 * Checks for token in Authorization header and cookies
 * @param req Express request object
 * @returns JWT token string or undefined if not found
 */
export const extractJwtFromRequest = (req: Request): string | undefined => {
  // Check Authorization header - Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  
  // Check cookies
  if (req.cookies && req.cookies.authToken) {
    return req.cookies.authToken;
  }
  
  // No token found
  return undefined;
};
