import prisma from "../config/db";

export interface HeldSaleItemInput {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  expiryDate?: string;
  prescriptionRequired?: boolean;
}

export interface CreateHeldSaleInput {
  label: string;
  customerId?: string;
  customerName?: string;
  discount: number;
  items: HeldSaleItemInput[];
  createdBy: string;
}

export const HeldSaleModel = {
  // Get all held sales for a cashier (or all for admin)
  findAll: (createdBy?: string) =>
    prisma.heldSale.findMany({
      where: createdBy ? { createdBy } : undefined,
      orderBy: { heldAt: "desc" },
    }),

  findById: (id: string) =>
    prisma.heldSale.findUnique({ where: { id } }),

  create: (input: CreateHeldSaleInput) =>
    prisma.heldSale.create({
      data: {
        label:        input.label,
        customerId:   input.customerId,
        customerName: input.customerName ?? "Walk-in",
        discount:     input.discount,
        items:        input.items as object[],
        createdBy:    input.createdBy,
      },
    }),

  delete: (id: string) =>
    prisma.heldSale.delete({ where: { id } }),

  // Delete all held sales by a specific user (e.g. on shift close)
  deleteByUser: (createdBy: string) =>
    prisma.heldSale.deleteMany({ where: { createdBy } }),
};
