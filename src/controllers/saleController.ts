import { Request, Response } from "express";
import { SaleModel } from "../models/saleModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, CreateSaleInput } from "../types";
import { SaleStatus } from "@prisma/client";

// Simple invoice number generator
function generateInvoiceNumber(prefix: string): string {
  const now = new Date();
  const yy  = String(now.getFullYear()).slice(-2);
  const mm  = String(now.getMonth() + 1).padStart(2, "0");
  const dd  = String(now.getDate()).padStart(2, "0");
  const rnd = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${yy}${mm}${dd}-${rnd}`;
}

export const saleController = {
  async getAll(req: Request, res: Response): Promise<void> {
    // Admin sees all sales; cashier sees only their own
    const cashierId = req.user!.role === "admin" ? undefined : req.user!.id;

    const result = await SaleModel.findAll({
      page:      Number(req.query.page)  || 1,
      limit:     Number(req.query.limit) || 10,
      search:    req.query.search as string | undefined,
      from:      req.query.from   as string | undefined,
      to:        req.query.to     as string | undefined,
      status:    req.query.status as SaleStatus | undefined,
      cashierId,
    });
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const sale = await SaleModel.findById(req.params.id);
    if (!sale) throw new AppError("Sale not found", 404);
    res.json({ success: true, data: sale } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as Omit<CreateSaleInput, "invoiceNumber" | "cashierId" | "cashierName">;

    const input: CreateSaleInput = {
      ...body,
      invoiceNumber: generateInvoiceNumber("INV"),
      cashierId:     req.user!.id,
      cashierName:   req.user!.name ?? req.user!.email,  // use real name from JWT
    };

    const sale = await SaleModel.create(input);
    res.status(201).json({ success: true, message: "Sale completed", data: sale } satisfies ApiResponse);
  },

  async refund(req: Request, res: Response): Promise<void> {
    const sale = await SaleModel.findById(req.params.id);
    if (!sale) throw new AppError("Sale not found", 404);
    if (sale.status === "Refunded") throw new AppError("Sale already refunded", 400);

    const updated = await SaleModel.refund(req.params.id);
    res.json({ success: true, message: "Sale refunded", data: updated } satisfies ApiResponse);
  },

  async todayStats(req: Request, res: Response): Promise<void> {
    // Cashier sees only their own today's stats
    const cashierId = req.user!.role === "admin" ? undefined : req.user!.id;
    const stats = await SaleModel.todayStats(cashierId);
    res.json({ success: true, data: stats } satisfies ApiResponse);
  },
};
