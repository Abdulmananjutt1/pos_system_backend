import { Request, Response } from "express";
import { ReturnModel } from "../models/returnModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, PaginationQuery } from "../types";

export const returnController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const query: PaginationQuery = {
      page:   Number(req.query.page)  || 1,
      limit:  Number(req.query.limit) || 10,
      search: req.query.search as string | undefined,
    };
    const result = await ReturnModel.findAll(query);
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const ret = await ReturnModel.findById(req.params.id);
    if (!ret) throw new AppError("Return not found", 404);
    res.json({ success: true, data: ret } satisfies ApiResponse);
  },

  async getStats(_req: Request, res: Response): Promise<void> {
    const stats = await ReturnModel.getStats();
    res.json({ success: true, data: stats } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const { saleId, items, refundMethod, notes } = req.body;
    if (!saleId)          throw new AppError("saleId is required", 400);
    if (!Array.isArray(items) || items.length === 0) throw new AppError("items array required", 400);
    if (!refundMethod)    throw new AppError("refundMethod is required", 400);

    const ret = await ReturnModel.create({ saleId, items, refundMethod, notes });
    res.status(201).json({ success: true, message: "Return processed", data: ret } satisfies ApiResponse);
  },
};
