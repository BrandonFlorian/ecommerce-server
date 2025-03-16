import type { Request } from "express";

export const extractJwtFromRequest = (req: Request): string | undefined => {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return req.headers.authorization.substring(7);
  }
  return undefined;
};
