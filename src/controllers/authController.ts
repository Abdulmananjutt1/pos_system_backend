import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, JwtPayload } from "../types";

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };

    const user = await UserModel.findByEmail(email);
    if (!user) throw new AppError("Invalid email or password", 401);

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new AppError("Invalid email or password", 401);

    const payload: JwtPayload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as string,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    } satisfies ApiResponse);
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await UserModel.findById(req.user!.id);
    if (!user) throw new AppError("User not found", 404);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safe } = user;
    res.json({ success: true, data: safe } satisfies ApiResponse);
  },

  // Refresh token — issue a new token if current one is still valid
  async refresh(req: Request, res: Response): Promise<void> {
    const user = await UserModel.findById(req.user!.id);
    if (!user || !user.isActive) throw new AppError("User not found or inactive", 401);

    const payload: JwtPayload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as string,
    });

    res.json({
      success: true,
      message: "Token refreshed",
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    } satisfies ApiResponse);
  },

  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password, role } = req.body as {
      name: string; email: string; password: string; role: "admin" | "cashier";
    };

    const existing = await UserModel.findByEmail(email);
    if (existing) throw new AppError("Email already in use", 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ name, email, passwordHash, role });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safe } = user;
    res.status(201).json({ success: true, message: "User created", data: safe } satisfies ApiResponse);
  },

  async listUsers(_req: Request, res: Response): Promise<void> {
    const users = await UserModel.findAll();
    res.json({ success: true, data: users } satisfies ApiResponse);
  },
};
