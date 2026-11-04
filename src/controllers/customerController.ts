import { Request, Response } from "express";
import { CustomerModel } from "../models/customerModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse } from "../types";

export const customerController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const result = await CustomerModel.findAll({
      page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10,
      search: req.query.search as string | undefined,
    });
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const c = await CustomerModel.findById(req.params.id);
    if (!c) throw new AppError("Customer not found", 404);
    res.json({ success: true, data: c } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const c = await CustomerModel.create(req.body);
    res.status(201).json({ success: true, message: "Customer created", data: c } satisfies ApiResponse);
  },

  async update(req: Request, res: Response): Promise<void> {
    const c = await CustomerModel.update(req.params.id, req.body);
    res.json({ success: true, message: "Customer updated", data: c } satisfies ApiResponse);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await CustomerModel.delete(req.params.id).catch(() => { throw new AppError("Customer not found", 404); });
    res.json({ success: true, message: "Customer deleted" } satisfies ApiResponse);
  },
};
