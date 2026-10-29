import { Request, Response } from "express";
import { SaleReturnModel } from "../models/saleReturnModel";
import { SaleModel } from "../models/saleModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, PaginationQuery } from "../types";

export const saleReturnController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const query: PaginationQuery = {
      page:   Number(req.query.page)  || 1,
      limit:  Number(req.query.limit) || 20,
      search: req.query.search as string | undefined,
    };
    const result = await SaleReturnModel.findAll(query);
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const ret = await SaleReturnModel.findById(req.params.id);
    if (!ret) throw new AppError("Return not found", 404);
    res.json({ success: true, data: ret } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const { saleId, items, refundMethod, notes } = req.body;

    if (!saleId) throw new AppError("Sale ID is required", 422);
    if (!items?.length) throw new AppError("At least one item is required", 422);

    const sale = await SaleModel.findById(saleId);
    if (!sale) throw new AppError("Sale not found", 404);
    if (sale.status === "Refunded") throw new AppError("Sale already refunded", 400);

    const itemsToReturn = items.filter((i: { returnQuantity: number }) => i.returnQuantity > 0);
    if (!itemsToReturn.length) throw new AppError("Select at least one item to return", 422);

    // Validate quantities
    for (const item of itemsToReturn) {
      const saleItem = sale.items.find((si) => si.medicineId === item.medicineId);
      if (saleItem && item.returnQuantity > saleItem.quantity) {
        throw new AppError(`Return qty for ${item.medicineName} exceeds sold qty`, 422);
      }
    }

    const refundAmount = itemsToReturn.reduce(
      (sum: number, i: { returnQuantity: number; unitPrice: number }) => sum + i.returnQuantity * Number(i.unitPrice),
      0
    );

    const ret = await SaleReturnModel.create({
      saleId,
      invoiceNumber: sale.invoiceNumber,
      returnDate:    new Date(),
      reason:        itemsToReturn[0]?.reason ?? "CustomerRequest",
      notes:         notes?.trim() || undefined,
      refundAmount,
      refundMethod:  refundMethod ?? "Cash",
      status:        "Approved",
      items:         itemsToReturn,
    });

    res.status(201).json({ success: true, message: "Return processed", data: ret } satisfies ApiResponse);
  },

  async stats(_req: Request, res: Response): Promise<void> {
    const stats = await SaleReturnModel.todayStats();
    res.json({ success: true, data: stats } satisfies ApiResponse);
  },
};
