import prisma from "../config/db";
import { Prisma, POStatus } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export interface CreatePurchaseOrderInput {
  supplierId:            string;
  expectedDeliveryDate?: string;
  notes?:                string;
  items: {
    medicineId:   string;
    medicineName: string;
    quantity:     number;
    unitPrice:    number;
    total:        number;
  }[];
}

export const PurchaseOrderModel = {
  async findAll(
    query: PaginationQuery & { status?: POStatus }
  ): Promise<PaginatedResponse> {
    const page  = Math.max(1, query.page  ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip  = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { poNumber: { contains: query.search, mode: "insensitive" } },
        { supplier: { name: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { id: true, name: true, contactPerson: true, phone: true } },
          items:    true,
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) =>
    prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { medicine: { select: { name: true, unit: true, stock: true } } },
        },
      },
    }),

  async create(input: CreatePurchaseOrderInput) {
    const totalAmount = input.items.reduce((sum, i) => sum + i.total, 0);
    const now    = new Date();
    const poNum  = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    return prisma.purchaseOrder.create({
      data: {
        poNumber:             poNum,
        supplierId:           input.supplierId,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
        notes:                input.notes,
        totalAmount,
        status:               "Draft",
        items: {
          create: input.items.map((i) => ({
            medicineId:   i.medicineId,
            medicineName: i.medicineName,
            quantity:     i.quantity,
            unitPrice:    i.unitPrice,
            total:        i.total,
          })),
        },
      },
      include: { supplier: true, items: true },
    });
  },

  update: (id: string, data: Prisma.PurchaseOrderUpdateInput) =>
    prisma.purchaseOrder.update({
      where: { id },
      data,
      include: { supplier: true, items: true },
    }),

  async receive(id: string, items: { medicineId: string; receivedQuantity: number; batchNumber?: string; expiryDate?: string }[]) {
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.receivedQuantity > 0) {
          await tx.medicine.update({
            where: { id: item.medicineId },
            data:  { stock: { increment: item.receivedQuantity } },
          });
          await tx.purchaseOrderItem.updateMany({
            where: { orderId: id, medicineId: item.medicineId },
            data:  {
              receivedQuantity: item.receivedQuantity,
              batchNumber:      item.batchNumber,
              expiryDate:       item.expiryDate ? new Date(item.expiryDate) : undefined,
            },
          });
        }
      }
      return tx.purchaseOrder.update({
        where: { id },
        data:  { status: "Received" },
        include: { supplier: true, items: true },
      });
    });
  },

  delete: (id: string) =>
    prisma.purchaseOrder.delete({ where: { id } }),
};
