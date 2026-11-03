import { Request, Response } from "express";
import { CashShiftModel } from "../models/cashShiftModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse } from "../types";

export const cashShiftController = {
  async getCurrent(_req: Request, res: Response): Promise<void> {
    const shift = await CashShiftModel.findOpen();
    res.json({ success: true, data: shift ?? null } satisfies ApiResponse);
  },

  async getAll(_req: Request, res: Response): Promise<void> {
    const shifts = await CashShiftModel.findAll();
    res.json({ success: true, data: shifts } satisfies ApiResponse);
  },

  async open(req: Request, res: Response): Promise<void> {
    const existing = await CashShiftModel.findOpen();
    if (existing) throw new AppError("A shift is already open", 400);

    const { openingBalance } = req.body as { openingBalance: number };
    if (openingBalance < 0) throw new AppError("Opening balance cannot be negative", 422);

    const shift = await CashShiftModel.open(req.user!.email, openingBalance);
    res.status(201).json({ success: true, message: "Shift opened", data: shift } satisfies ApiResponse);
  },

  async close(req: Request, res: Response): Promise<void> {
    const { closingBalance, notes } = req.body as { closingBalance: number; notes?: string };
    if (closingBalance < 0) throw new AppError("Closing balance cannot be negative", 422);

    const shift = await CashShiftModel.findById(req.params.id);
    if (!shift) throw new AppError("Shift not found", 404);
    if (shift.status === "Closed") throw new AppError("Shift already closed", 400);

    const closed = await CashShiftModel.close(req.params.id, req.user!.email, closingBalance, notes);
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

    const entry = await CashShiftModel.addEntry(req.params.id, description, amount, type);
    res.status(201).json({ success: true, message: "Entry added", data: entry } satisfies ApiResponse);
  },
};
