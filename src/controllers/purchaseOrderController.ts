import { Request, Response } from "express";
import { PurchaseOrderModel } from "../models/purchaseOrderModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, PaginationQuery } from "../types";

export const purchaseOrderController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const query: PaginationQuery = {
      page:   Number(req.query.page)  || 1,
      limit:  Number(req.query.limit) || 20,
      search: req.query.search as string | undefined,
    };
    const result = await PurchaseOrderModel.findAll(query);
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const po = await PurchaseOrderModel.findById(req.params.id);
    if (!po) throw new AppError("Purchase order not found", 404);
    res.json({ success: true, data: po } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const { supplierId, supplierName, poDate, expectedDeliveryDate, notes, items } = req.body;

    if (!items?.length) throw new AppError("At least one item is required", 422);

    const totalAmount = items.reduce(
      (sum: number, i: { total: number }) => sum + Number(i.total),
      0
    );

    const po = await PurchaseOrderModel.create({
      supplierId:           supplierId?.trim() || undefined,
      supplierName:         supplierName ?? "",
      poDate:               poDate ? new Date(poDate) : new Date(),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      status:               "Draft",
      totalAmount,
      notes:                notes?.trim() || undefined,
      items,
    });

    res.status(201).json({ success: true, message: "Purchase order created", data: po } satisfies ApiResponse);
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const { status } = req.body as { status: string };
    const valid = ["Draft", "Sent", "Confirmed", "PartiallyReceived", "Received", "Cancelled"];
    if (!valid.includes(status)) throw new AppError("Invalid status", 422);

    const po = await PurchaseOrderModel.updateStatus(req.params.id, status);
    res.json({ success: true, message: "Status updated", data: po } satisfies ApiResponse);
  },

  async receiveGoods(req: Request, res: Response): Promise<void> {
    const { items } = req.body as {
      items: { id: string; receivedQuantity: number; batchNumber?: string; expiryDate?: string }[];
    };
    if (!items?.length) throw new AppError("Items are required", 422);

    const po = await PurchaseOrderModel.receiveGoods(req.params.id, items);
    res.json({ success: true, message: "Goods received and stock updated", data: po } satisfies ApiResponse);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const po = await PurchaseOrderModel.findById(req.params.id);
    if (!po) throw new AppError("Purchase order not found", 404);
    if (po.status !== "Draft") throw new AppError("Only Draft orders can be deleted", 422);
    await PurchaseOrderModel.delete(req.params.id);
    res.json({ success: true, message: "Purchase order deleted" } satisfies ApiResponse);
  },
};
