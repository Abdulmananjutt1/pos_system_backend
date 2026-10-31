import { Request, Response } from "express";
import { SupplierModel } from "../models/supplierModel";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse } from "../types";

export const supplierController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const result = await SupplierModel.findAll({
      page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10,
      search: req.query.search as string | undefined,
    });
    res.json({ success: true, data: result } satisfies ApiResponse);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const s = await SupplierModel.findById(req.params.id);
    if (!s) throw new AppError("Supplier not found", 404);
    res.json({ success: true, data: s } satisfies ApiResponse);
  },

  async create(req: Request, res: Response): Promise<void> {
    const { contact_person, contactPerson, ...rest } = req.body;
    const s = await SupplierModel.create({
      ...rest,
      contactPerson: contactPerson || contact_person || "",
    });
    res.status(201).json({ success: true, message: "Supplier created", data: s } satisfies ApiResponse);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { contact_person, contactPerson, ...rest } = req.body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { ...rest };
    if (contactPerson !== undefined || contact_person !== undefined) {
      payload.contactPerson = contactPerson || contact_person || "";
    }
    const s = await SupplierModel.update(req.params.id, payload);
    res.json({ success: true, message: "Supplier updated", data: s } satisfies ApiResponse);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await SupplierModel.delete(req.params.id).catch(() => { throw new AppError("Supplier not found", 404); });
    res.json({ success: true, message: "Supplier deleted" } satisfies ApiResponse);
  },
};
