import { Request, Response } from "express";
import { PurchaseOrderModel } from "../models/purchaseOrderModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, PaginationQuery } from "../types";
import { POStatus } from "@prisma/client";

export const purchaseOrderController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const query: PaginationQuery & { status?: POStatus } = {
      page:   Number(req.query.page)  || 1,
      limit:  Number(req.query.limit) || 20,
      search: req.query.search as string | undefined,
      status: req.query.status as POStatus | undefined,
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
    const { supplierId, expectedDeliveryDate, notes, items } = req.body;
    if (!supplierId) throw new AppError("supplierId is required", 400);
    if (!Array.isArray(items) || items.length === 0) throw new AppError("items required", 400);

    const po = await PurchaseOrderModel.create({ supplierId, expectedDeliveryDate, notes, items });
    res.status(201).json({ success: true, message: "Purchase order created", data: po } satisfies ApiResponse);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { status, notes, expectedDeliveryDate } = req.body;
    const po = await PurchaseOrderModel.update(req.params.id, {
      ...(status && { status }),
      ...(notes  !== undefined && { notes }),
      ...(expectedDeliveryDate && { expectedDeliveryDate: new Date(expectedDeliveryDate) }),
    });
    res.json({ success: true, message: "Purchase order updated", data: po } satisfies ApiResponse);
  },

  async receive(req: Request, res: Response): Promise<void> {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new AppError("items array required", 400);
    const po = await PurchaseOrderModel.receive(req.params.id, items);
    res.json({ success: true, message: "Purchase order received", data: po } satisfies ApiResponse);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await PurchaseOrderModel.delete(req.params.id);
    res.json({ success: true, message: "Purchase order deleted" } satisfies ApiResponse);
  },
};
