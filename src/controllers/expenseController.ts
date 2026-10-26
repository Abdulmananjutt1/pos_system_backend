import { Request, Response } from "express";
import { ExpenseModel } from "../models/expenseModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse } from "../types";

export const expenseController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const result = await ExpenseModel.findAll({
      page:  Number(req.query.page)  || 1,
      limit: Number(req.query.limit) || 20,
      from:  req.query.from as string | undefined,
      to:    req.query.to   as string | undefined,
    });
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const { date, ...rest } = req.body;
    const expense = await ExpenseModel.create({ ...rest, date: new Date(date) });
    res.status(201).json({ success: true, message: "Expense logged", data: expense } satisfies ApiResponse);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await ExpenseModel.delete(req.params.id).catch(() => { throw new AppError("Expense not found", 404); });
    res.json({ success: true, message: "Expense deleted" } satisfies ApiResponse);
  },

  async summary(req: Request, res: Response): Promise<void> {
    const year  = Number(req.query.year)  || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const data  = await ExpenseModel.summary(year, month);
    res.json({ success: true, data } satisfies ApiResponse);
  },
};
