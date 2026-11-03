import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload, UserRole } from "../types";
import { AppError } from "./errorHandler";
import { Permission, hasPermission } from "../config/permissions";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("No token provided", 401);
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}

// Role-based guard — only admin / cashier
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("Access denied: insufficient permissions", 403);
    }
    next();
  };
}

// Permission-based guard — granular
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError("Not authenticated", 401);
    if (!hasPermission(req.user.role, req.user.permissions ?? [], permission)) {
      throw new AppError(`Access denied: missing permission '${permission}'`, 403);
    }
    next();
  };
}
