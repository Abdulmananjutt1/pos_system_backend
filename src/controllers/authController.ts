import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel";
import { LoginHistoryModel } from "../models/loginHistoryModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, JwtPayload } from "../types";

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };

    // Extract IP and user agent for login history
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress
      ?? "unknown";
    const userAgent = req.headers["user-agent"] ?? "unknown";

    const user = await UserModel.findByEmail(email);
    if (!user) {
      // Record failed login attempt if user exists (don't reveal if user exists)
      throw new AppError("Invalid email or password", 401);
    }

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

    const payload: JwtPayload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });

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
