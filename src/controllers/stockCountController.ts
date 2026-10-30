import { Request, Response } from "express";
import { StockCountModel } from "../models/stockCountModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, PaginationQuery } from "../types";

export const stockCountController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const query: PaginationQuery = {
      page:  Number(req.query.page)  || 1,
      limit: Number(req.query.limit) || 20,
    };
    const result = await StockCountModel.findAll(query);
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const count = await StockCountModel.findById(req.params.id);
    if (!count) throw new AppError("Stock count not found", 404);
    res.json({ success: true, data: count } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const count = await StockCountModel.create(req.user!.id);
    res.status(201).json({ success: true, message: "Stock count started", data: count } satisfies ApiResponse);
  },

  async updateItem(req: Request, res: Response): Promise<void> {
    const { medicineId, physicalCount, notes } = req.body;
    if (typeof physicalCount !== "number" || physicalCount < 0) {
      throw new AppError("physicalCount must be a non-negative number", 400);
    }
    await StockCountModel.updateItem(req.params.id, medicineId, physicalCount, notes);
    res.json({ success: true, message: "Item updated" } satisfies ApiResponse);
  },

  async finalize(req: Request, res: Response): Promise<void> {
    const count = await StockCountModel.finalize(req.params.id);
    res.json({ success: true, message: "Stock count finalized", data: count } satisfies ApiResponse);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await StockCountModel.delete(req.params.id);
    res.json({ success: true, message: "Stock count deleted" } satisfies ApiResponse);
  },
};
