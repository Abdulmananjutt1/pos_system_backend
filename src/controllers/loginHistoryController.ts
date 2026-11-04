import { Request, Response } from "express";
import { LoginHistoryModel } from "../models/loginHistoryModel";
import { ApiResponse, PaginationQuery } from "../types";

export const loginHistoryController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const query: PaginationQuery & { userId?: string; action?: string } = {
      page:   Number(req.query.page)   || 1,
      limit:  Number(req.query.limit)  || 10,
      search: req.query.search as string | undefined,
      action: req.query.action as string | undefined,
    };

    // Admin can see all; cashier can only see their own
    if (req.user!.role !== "admin") {
      query.userId = req.user!.id;
    }

    const result = await LoginHistoryModel.findAll(query);
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getStats(_req: Request, res: Response): Promise<void> {
    const stats = await LoginHistoryModel.getStats();
    res.json({ success: true, data: stats } satisfies ApiResponse);
  },
};
