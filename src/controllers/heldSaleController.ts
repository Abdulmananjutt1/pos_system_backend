import { Request, Response } from "express";
import { HeldSaleModel } from "../models/heldSaleModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse } from "../types";

// Helper: map prisma HeldSale row → frontend-friendly shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHeldSale(h: any) {
  return {
    id:           h.id,
    label:        h.label,
    customerId:   h.customerId   ?? h.customer_id,
    customerName: h.customerName ?? h.customer_name ?? "Walk-in",
    discount:     Number(h.discount ?? 0),
    cart:         Array.isArray(h.items) ? h.items : [],
    heldAt:       h.heldAt       ?? h.held_at,
    createdBy:    h.createdBy    ?? h.created_by,
  };
}

export const heldSaleController = {
  // GET /api/held-sales  — returns all held sales for current user
  async getAll(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const role   = req.user!.role;

    // Admin can see all; cashier sees only their own
    const rows = await HeldSaleModel.findAll(role === "admin" ? undefined : userId);
    res.json({ success: true, data: rows.map(mapHeldSale) } satisfies ApiResponse);
  },

  // POST /api/held-sales  — park current cart
  async create(req: Request, res: Response): Promise<void> {
    const { label, customerId, customerName, discount, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Cart items are required", 400);
    }

    const held = await HeldSaleModel.create({
      label:        label || `Hold ${new Date().toLocaleTimeString()}`,
      customerId,
      customerName: customerName ?? "Walk-in",
      discount:     Number(discount ?? 0),
      items,
      createdBy:    req.user!.id,
    });

    res.status(201).json({
      success: true,
      message: "Sale held successfully",
      data: mapHeldSale(held),
    } satisfies ApiResponse);
  },

  // DELETE /api/held-sales/:id  — discard a held sale
  async remove(req: Request, res: Response): Promise<void> {
    const held = await HeldSaleModel.findById(req.params.id);
    if (!held) throw new AppError("Held sale not found", 404);

    // Only owner or admin can delete
    if (held.createdBy !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Not authorized", 403);
    }

    await HeldSaleModel.delete(req.params.id);
    res.json({ success: true, message: "Held sale discarded" } satisfies ApiResponse);
  },
};
