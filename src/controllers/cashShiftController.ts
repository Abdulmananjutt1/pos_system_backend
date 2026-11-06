import { Request, Response } from "express";
import { CashShiftModel } from "../models/cashShiftModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse } from "../types";

export const cashShiftController = {
  async getCurrent(req: Request, res: Response): Promise<void> {
    // Cashier sees only their own open shift
    const openedBy = req.user!.role === "admin" ? undefined : req.user!.email;
    const shift = await CashShiftModel.findOpen(openedBy);
    res.json({ success: true, data: shift ?? null } satisfies ApiResponse);
  },

  async getAll(req: Request, res: Response): Promise<void> {
    // Admin sees all shifts; cashier sees only their own (matched by email)
    const openedBy = req.user!.role === "admin" ? undefined : req.user!.email;
    const shifts = await CashShiftModel.findAll(openedBy);
    res.json({ success: true, data: shifts } satisfies ApiResponse);
  },

  async open(req: Request, res: Response): Promise<void> {
    // Check if current user already has an open shift
    const openedBy  = req.user!.email;
    const existing  = await CashShiftModel.findOpen(openedBy);
    if (existing) throw new AppError("You already have an open shift", 400);

    const { openingBalance } = req.body as { openingBalance: number };
    if (openingBalance < 0) throw new AppError("Opening balance cannot be negative", 422);

    // Store cashier's real name for display
    const displayName = req.user!.name ?? req.user!.email;
    const shift = await CashShiftModel.open(openedBy, openingBalance, displayName);
    res.status(201).json({ success: true, message: "Shift opened", data: shift } satisfies ApiResponse);
  },

  async close(req: Request, res: Response): Promise<void> {
    const { closingBalance, notes } = req.body as { closingBalance: number; notes?: string };
    if (closingBalance < 0) throw new AppError("Closing balance cannot be negative", 422);

    const shift = await CashShiftModel.findById(req.params.id);
    if (!shift) throw new AppError("Shift not found", 404);
    if (shift.status === "Closed") throw new AppError("Shift already closed", 400);

    // Cashier can only close their own shift (check email suffix in openedBy)
    if (req.user!.role !== "admin") {
      const email = req.user!.email;
      const owns  = shift.openedBy === email || shift.openedBy.endsWith(`|${email}`);
      if (!owns) throw new AppError("You can only close your own shift", 403);
    }

    const closedByName = req.user!.name ?? req.user!.email;
    const closed = await CashShiftModel.close(req.params.id, closedByName, closingBalance, notes);
    res.json({ success: true, message: "Shift closed", data: closed } satisfies ApiResponse);
  },

  async addEntry(req: Request, res: Response): Promise<void> {
    const { description, amount, type } = req.body as { description: string; amount: number; type: "in" | "out" };
    if (!description) throw new AppError("Description is required", 422);
    if (amount <= 0)   throw new AppError("Amount must be greater than 0", 422);
    if (!["in", "out"].includes(type)) throw new AppError("Type must be 'in' or 'out'", 422);

    const shift = await CashShiftModel.findById(req.params.id);
    if (!shift) throw new AppError("Shift not found", 404);
    if (shift.status === "Closed") throw new AppError("Cannot add entry to closed shift", 400);

    // Cashier can only add entries to their own shift
    if (req.user!.role !== "admin") {
      const email = req.user!.email;
      const owns  = shift.openedBy === email || shift.openedBy.endsWith(`|${email}`);
      if (!owns) throw new AppError("You can only add entries to your own shift", 403);
    }

    const entry = await CashShiftModel.addEntry(req.params.id, description, amount, type);
    res.status(201).json({ success: true, message: "Entry added", data: entry } satisfies ApiResponse);
  },
};
