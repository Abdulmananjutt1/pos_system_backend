import { Request, Response, NextFunction } from 'express';
import { checkPermission } from '../controllers/permissionController';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

/**
 * Middleware to check if user has required permission
 * @param permissionName - The permission to check (e.g., 'create_medicine', 'view_sales')
 */
export const requirePermission = (permissionName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Super admin bypass (optional - comment out if you want strict permission checking)
      // if (req.user.role === 'admin') {
      //   return next();
      // }

      const hasPermission = await checkPermission(req.user.id, permissionName);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action',
          requiredPermission: permissionName,
        });
      }

      next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: error.message,
      });
    }
  };
};

/**
 * Middleware to check if user has ANY of the required permissions
 * @param permissionNames - Array of permission names
 */
export const requireAnyPermission = (permissionNames: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const checks = await Promise.all(
        permissionNames.map((perm) => checkPermission(req.user!.id, perm))
      );

      const hasAnyPermission = checks.some((result) => result === true);

      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action',
          requiredPermissions: permissionNames,
        });
      }

      next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: error.message,
      });
    }
  };
};

/**
 * Middleware to check if user has ALL of the required permissions
 * @param permissionNames - Array of permission names
 */
export const requireAllPermissions = (permissionNames: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const checks = await Promise.all(
        permissionNames.map((perm) => checkPermission(req.user!.id, perm))
      );

      const hasAllPermissions = checks.every((result) => result === true);

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: 'You do not have all required permissions',
          requiredPermissions: permissionNames,
        });
      }

      next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: error.message,
      });
    }
  };
};
