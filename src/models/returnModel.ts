import prisma from "../config/db";
import { Prisma, PaymentMethod } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export interface CreateReturnItemInput {
  medicineId:     string;
  medicineName:   string;
  saleQuantity:   number;
  returnQuantity: number;
  unitPrice:      number;
  reason:         string;
  condition:      string;
}

export interface CreateReturnInput {
  saleId:       string;
  items:        CreateReturnItemInput[];
  refundMethod: string;
  notes?:       string;
}

export const ReturnModel = {
  async findAll(query: PaginationQuery): Promise<PaginatedResponse> {
    const page  = Math.max(1, query.page  ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip  = (page - 1) * limit;

    const where: Prisma.SaleReturnWhereInput = {};
    if (query.search) {
      where.OR = [
        { returnNumber:  { contains: query.search, mode: "insensitive" } },
        { invoiceNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.saleReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { returnDate: "desc" },
        include: {
          items: true,
          sale: { select: { invoiceNumber: true, customerName: true } },
        },
      }),
      prisma.saleReturn.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) =>
    prisma.saleReturn.findUnique({
      where: { id },
      include: {
        items: { include: { medicine: { select: { name: true } } } },
        sale:  { select: { invoiceNumber: true, customerName: true } },
      },
    }),

  async create(input: CreateReturnInput) {
    return prisma.$transaction(async (tx) => {
      // Fetch the sale to validate
      const sale = await tx.sale.findUnique({
        where: { id: input.saleId },
        include: { items: true },
      });
      if (!sale) throw new Error("Sale not found");
      if (sale.status === "Refunded") throw new Error("Sale already refunded");

      const itemsToReturn = input.items.filter((i) => i.returnQuantity > 0);
      if (!itemsToReturn.length) throw new Error("No items to return");

      // Calculate refund total
      const refundAmount = itemsToReturn.reduce(
        (sum, i) => sum + i.returnQuantity * i.unitPrice,
        0
      );

      // Generate return number
      const now   = new Date();
      const rn    = `RET-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      const ret = await tx.saleReturn.create({
        data: {
          returnNumber:  rn,
          invoiceNumber: sale.invoiceNumber,
          saleId:        input.saleId,
          reason:        itemsToReturn[0]?.reason ?? "CustomerRequest",
          notes:         input.notes,
          refundAmount:  refundAmount,
          refundMethod:  input.refundMethod as PaymentMethod,
          status:        "Approved",
          items: {
            create: itemsToReturn.map((i) => ({
              medicineId:     i.medicineId,
              medicineName:   i.medicineName,
              saleQuantity:   i.saleQuantity,
              returnQuantity: i.returnQuantity,
              unitPrice:      i.unitPrice,
              reason:         i.reason as Prisma.SaleReturnItemCreateInput["reason"],
              condition:      i.condition as Prisma.SaleReturnItemCreateInput["condition"],
            })),
          },
        },
        include: { items: true },
      });

      // Restock items that are in Good condition
      for (const item of itemsToReturn) {
        if (item.condition === "Good") {
          await tx.medicine.update({
            where: { id: item.medicineId },
            data:  { stock: { increment: item.returnQuantity } },
          });
        }
      }

      // Mark sale as Refunded
      await tx.sale.update({
        where: { id: input.saleId },
        data:  { status: "Refunded" },
      });

      return ret;
    });
  },

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, sumResult] = await prisma.$transaction([
      prisma.saleReturn.count(),
      prisma.saleReturn.count({ where: { returnDate: { gte: today } } }),
      prisma.saleReturn.aggregate({ _sum: { refundAmount: true } }),
    ]);

    return {
      total,
      today: todayCount,
      totalAmount: Number(sumResult._sum.refundAmount ?? 0),
    };
  },
};
