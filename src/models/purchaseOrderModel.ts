import prisma from "../config/db";
<<<<<<< HEAD
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
=======
import { Prisma } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const PurchaseOrderModel = {
  async findAll(query: PaginationQuery): Promise<PaginatedResponse> {
    const page  = Math.max(1, query.page  ?? 1);
    const limit = Math.min(100, query.limit ?? 20);
    const skip  = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = query.search
      ? {
          OR: [
            { poNumber:     { contains: query.search, mode: "insensitive" } },
            { supplierName: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

    const [items, total] = await prisma.$transaction([
      prisma.purchaseOrder.findMany({
        where,
<<<<<<< HEAD
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { id: true, name: true, contactPerson: true, phone: true } },
          items:    true,
=======
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: true,
          supplier: { select: { id: true, name: true } },
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
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
<<<<<<< HEAD
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
=======
        items: { include: { medicine: { select: { id: true, name: true } } } },
        supplier: { select: { id: true, name: true } },
      },
    }),

  async create(data: {
    supplierId?:           string;
    supplierName:          string;
    poDate:                Date;
    expectedDeliveryDate?: Date;
    status:                string;
    totalAmount:           number;
    notes?:                string;
    items: {
      medicineId?:  string;
      medicineName: string;
      quantity:     number;
      unitPrice:    number;
      total:        number;
    }[];
  }) {
    const poNumber = `PO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    return prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierName: data.supplierName,
        poDate:       data.poDate,
        expectedDeliveryDate: data.expectedDeliveryDate,
        status:       data.status as Prisma.EnumPOStatusFilter["equals"],
        totalAmount:  data.totalAmount,
        notes:        data.notes,
        ...(data.supplierId ? { supplier: { connect: { id: data.supplierId } } } : {}),
        items: {
          create: data.items.map((i) => ({
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
            medicineName: i.medicineName,
            quantity:     i.quantity,
            unitPrice:    i.unitPrice,
            total:        i.total,
<<<<<<< HEAD
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
=======
            receivedQuantity: 0,
            ...(i.medicineId ? { medicine: { connect: { id: i.medicineId } } } : {}),
          })),
        },
      },
      include: { items: true },
    });
  },

  async updateStatus(id: string, status: string) {
    return prisma.purchaseOrder.update({
      where: { id },
      data:  { status: status as Prisma.EnumPOStatusFilter["equals"] },
      include: { items: true },
    });
  },

  async receiveGoods(
    id: string,
    items: { id: string; receivedQuantity: number; batchNumber?: string; expiryDate?: string }[]
  ) {
    // Update each item and adjust medicine stock in a transaction
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        const existing = await tx.purchaseOrderItem.findUnique({ where: { id: item.id } });
        if (!existing) continue;

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: {
            receivedQuantity: item.receivedQuantity,
            batchNumber:      item.batchNumber,
            expiryDate:       item.expiryDate ? new Date(item.expiryDate) : undefined,
          },
        });

        // Update medicine stock if medicineId present
        if (existing.medicineId && item.receivedQuantity > 0) {
          await tx.medicine.update({
            where: { id: existing.medicineId },
            data:  { stock: { increment: item.receivedQuantity } },
          });
        }
      }

      // Check if all received → mark Received, else PartiallyReceived
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      const allReceived = po?.items.every((i) => i.receivedQuantity >= i.quantity);
      const newStatus = allReceived ? "Received" : "PartiallyReceived";

      return tx.purchaseOrder.update({
        where: { id },
        data:  { status: newStatus as Prisma.EnumPOStatusFilter["equals"] },
        include: { items: true },
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
      });
    });
  },

  delete: (id: string) =>
    prisma.purchaseOrder.delete({ where: { id } }),
};
