import { Request, Response } from "express";
import { StockTransferModel } from "../models/stockTransferModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, PaginationQuery } from "../types";

export const stockTransferController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const query: PaginationQuery = {
      page:   Number(req.query.page)  || 1,
      limit:  Number(req.query.limit) || 20,
      search: req.query.search as string | undefined,
    };
    const result = await StockTransferModel.findAll(query);
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const t = await StockTransferModel.findById(req.params.id);
    if (!t) throw new AppError("Transfer not found", 404);
    res.json({ success: true, data: t } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const { fromBranch, toBranch, transferDate, notes, initiatedBy, items } = req.body;

    if (!items?.length) throw new AppError("At least one item is required", 422);
    if (fromBranch === toBranch) throw new AppError("Source and destination cannot be the same", 422);

    const transfer = await StockTransferModel.create({
      fromBranch,
      toBranch,
      transferDate: transferDate ? new Date(transferDate) : new Date(),
      notes:        notes?.trim() || undefined,
      initiatedBy:  initiatedBy ?? "Admin",
      items,
    });

    res.status(201).json({ success: true, message: "Transfer initiated", data: transfer } satisfies ApiResponse);
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const { status } = req.body as { status: string };
    const valid = ["Pending", "InTransit", "Received", "Rejected"];
    if (!valid.includes(status)) throw new AppError("Invalid status", 422);

    const transfer = await StockTransferModel.updateStatus(req.params.id, status);
    res.json({ success: true, message: "Status updated", data: transfer } satisfies ApiResponse);
  },

  async receive(req: Request, res: Response): Promise<void> {
    const transfer = await StockTransferModel.receive(req.params.id);
    res.json({ success: true, message: "Transfer received — stock updated", data: transfer } satisfies ApiResponse);
  },
};
