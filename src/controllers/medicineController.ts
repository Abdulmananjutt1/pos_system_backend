import { Request, Response } from "express";
import { MedicineModel } from "../models/medicineModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse, PaginationQuery } from "../types";

export const medicineController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const query: PaginationQuery = {
      page:      Number(req.query.page)  || 1,
      limit:     Number(req.query.limit) || 20,
      search:    req.query.search   as string | undefined,
      sortBy:    req.query.sortBy   as string | undefined,
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "asc",
    };
    const result = await MedicineModel.findAll(query);
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const medicine = await MedicineModel.findById(req.params.id);
    if (!medicine) throw new AppError("Medicine not found", 404);
    res.json({ success: true, data: medicine } satisfies ApiResponse);
  },

  async getLowStock(req: Request, res: Response): Promise<void> {
    const threshold = Number(req.query.threshold) || 10;
    const items = await MedicineModel.findLowStock(threshold);
    res.json({ success: true, data: items } satisfies ApiResponse);
  },

  async getExpiring(req: Request, res: Response): Promise<void> {
    const days = Number(req.query.days) || 30;
    const items = await MedicineModel.findExpiring(days);
    res.json({ success: true, data: items } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const { supplierId, expiryDate, ...rest } = req.body;
    const medicine = await MedicineModel.create({
      ...rest,
      expiryDate: new Date(expiryDate),
      ...(supplierId && { supplier: { connect: { id: supplierId } } }),
    });
    res.status(201).json({ success: true, message: "Medicine created", data: medicine } satisfies ApiResponse);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { supplierId, expiryDate, ...rest } = req.body;
    const medicine = await MedicineModel.update(req.params.id, {
      ...rest,
      ...(expiryDate && { expiryDate: new Date(expiryDate) }),
      ...(supplierId && { supplier: { connect: { id: supplierId } } }),
    });
    res.json({ success: true, message: "Medicine updated", data: medicine } satisfies ApiResponse);
  },

  async adjustStock(req: Request, res: Response): Promise<void> {
    const { adjustment } = req.body as { adjustment: number };
    const medicine = await MedicineModel.adjustStock(req.params.id, adjustment);
    res.json({ success: true, message: "Stock adjusted", data: medicine } satisfies ApiResponse);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await MedicineModel.delete(req.params.id);
    res.json({ success: true, message: "Medicine deleted" } satisfies ApiResponse);
  },
};
