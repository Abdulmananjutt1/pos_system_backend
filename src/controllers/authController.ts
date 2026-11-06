import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel";
import { LoginHistoryModel } from "../models/loginHistoryModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, JwtPayload } from "../types";
import {
  ADMIN_ALL_PERMISSIONS,
  CASHIER_DEFAULT_PERMISSIONS,
} from "../config/permissions";

function buildToken(user: { id: string; name: string; email: string; role: string; permissions: string[] }): string {
  const permissions = user.role === "admin"
    ? ADMIN_ALL_PERMISSIONS
    : user.permissions.length > 0
      ? user.permissions
      : CASHIER_DEFAULT_PERMISSIONS;

  const payload: JwtPayload = {
    id:          user.id,
    name:        user.name,
    email:       user.email,
    role:        user.role as "admin" | "cashier",
    permissions: permissions as string[],
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as string,
  });
}

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };

    // Extract IP and user agent for login history
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress
      ?? "unknown";
    const userAgent = req.headers["user-agent"] ?? "unknown";

    const user = await UserModel.findByEmail(email);
    if (!user) throw new AppError("Invalid email or password", 401);
    if (!user.isActive) throw new AppError("Account is inactive", 403);

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      // Record failed login
      await LoginHistoryModel.create({
        userId:    user.id,
        action:    "Login",
        ipAddress,
        userAgent,
        status:    "failed",
      }).catch(() => {}); // Don't fail request if history write fails
      throw new AppError("Invalid email or password", 401);
    }

    // Record successful login
    await LoginHistoryModel.create({
      userId:    user.id,
      action:    "Login",
      ipAddress,
      userAgent,
      status:    "success",
    }).catch(() => {});

    const token = buildToken(user);
    const permissions = user.role === "admin"
      ? ADMIN_ALL_PERMISSIONS
      : user.permissions.length > 0 ? user.permissions : CASHIER_DEFAULT_PERMISSIONS;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id:          user.id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          permissions,
        },
      },
    } satisfies ApiResponse);
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await UserModel.findById(req.user!.id);
    if (!user) throw new AppError("User not found", 404);
    const { passwordHash: _, ...safe } = user;
    const permissions = user.role === "admin"
      ? ADMIN_ALL_PERMISSIONS
      : user.permissions.length > 0 ? user.permissions : CASHIER_DEFAULT_PERMISSIONS;
    res.json({ success: true, data: { ...safe, permissions } } satisfies ApiResponse);
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const user = await UserModel.findById(req.user!.id);
    if (!user || !user.isActive) throw new AppError("User not found or inactive", 401);
    const token = buildToken(user);
    res.json({ success: true, message: "Token refreshed", data: { token } } satisfies ApiResponse);
  },

  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password, role } = req.body as {
      name: string; email: string; password: string; role: "admin" | "cashier";
    };
    const existing = await UserModel.findByEmail(email);
    if (existing) throw new AppError("Email already in use", 409);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ name, email, passwordHash, role });
    const { passwordHash: _, ...safe } = user;
    res.status(201).json({ success: true, message: "User created", data: safe } satisfies ApiResponse);
  },

  async listUsers(_req: Request, res: Response): Promise<void> {
    const users = await UserModel.findAll();
    res.json({ success: true, data: users } satisfies ApiResponse);
  },

  // Update user (name, email, role, isActive) — admin only
  async updateUser(req: Request, res: Response): Promise<void> {
    const { name, email, password, role, isActive } = req.body as {
      name?: string; email?: string; password?: string;
      role?: "admin" | "cashier"; isActive?: boolean;
    };
    const user = await UserModel.findById(req.params.id);
    if (!user) throw new AppError("User not found", 404);

    // Don't let admin accidentally lock themselves out
    if (req.params.id === req.user!.id && isActive === false) {
      throw new AppError("You cannot deactivate your own account", 400);
    }

    // If email is changing, make sure it's unique
    if (email && email !== user.email) {
      const existing = await UserModel.findByEmail(email);
      if (existing && existing.id !== req.params.id) {
        throw new AppError("Email already in use", 409);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined)     updateData.name     = name;
    if (email !== undefined)    updateData.email    = email;
    if (role !== undefined)     updateData.role     = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

    const updated = await UserModel.update(req.params.id, updateData);
    const { passwordHash: _, ...safe } = updated;
    res.json({ success: true, message: "User updated", data: safe } satisfies ApiResponse);
  },

  // Delete user (admin only) — cannot delete self
  async deleteUser(req: Request, res: Response): Promise<void> {
    if (req.params.id === req.user!.id) {
      throw new AppError("You cannot delete your own account", 400);
    }
    const user = await UserModel.findById(req.params.id);
    if (!user) throw new AppError("User not found", 404);

    await UserModel.deactivate(req.params.id);
    res.json({ success: true, message: "User deactivated successfully" } satisfies ApiResponse);
  },

  // Update user permissions (admin only)
  async updatePermissions(req: Request, res: Response): Promise<void> {
    const { permissions } = req.body as { permissions: string[] };
    const user = await UserModel.findById(req.params.id);
    if (!user) throw new AppError("User not found", 404);
    if (user.role === "admin") throw new AppError("Admin permissions cannot be modified", 400);

    const updated = await UserModel.updatePermissions(req.params.id, permissions);
    res.json({ success: true, message: "Permissions updated", data: updated } satisfies ApiResponse);
  },
};
