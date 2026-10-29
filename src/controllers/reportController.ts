import { Request, Response } from "express";
import { ApiResponse } from "../types";
import prisma from "../config/db";
import { Prisma } from "@prisma/client";

export const reportController = {
  async getSummary(req: Request, res: Response): Promise<void> {
    const { from, to } = req.query as { from?: string; to?: string };

    const dateFilter: Prisma.SaleWhereInput = from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to   && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
          },
        }
      : {};

    const returnDateFilter: Prisma.SaleReturnWhereInput = from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to   && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
          },
        }
      : {};

    const [
      salesAgg,
      paymentBreakdown,
      topMedicines,
      customerCount,
      medicineCount,
      returnAgg,
      recentSales,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where:  { status: "Completed", ...dateFilter },
        _count: { id: true },
        _sum:   { total: true, discount: true },
      }),

      prisma.sale.groupBy({
        by:     ["paymentMethod"],
        where:  { status: "Completed", ...dateFilter },
        _count: { id: true },
        _sum:   { total: true },
      }),

      prisma.saleItem.groupBy({
        by:      ["medicineId", "medicineName"],
        where:   { sale: { status: "Completed", ...dateFilter } },
        _sum:    { total: true, quantity: true },
        orderBy: { _sum: { total: "desc" } },
        take:    10,
      }),

      prisma.customer.count(),

      prisma.medicine.count(),

      prisma.saleReturn.aggregate({
        where:  returnDateFilter,
        _count: { id: true },
        _sum:   { refundAmount: true },
      }),

      prisma.sale.findMany({
        where:   { ...dateFilter },
        orderBy: { createdAt: "desc" },
        take:    50,
        include: { items: true },
      }),
    ]);

    const totalRevenue = Number(salesAgg._sum.total   ?? 0);
    const totalSales   = salesAgg._count.id;
    const avgOrder     = totalSales > 0 ? totalRevenue / totalSales : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalSales,
          avgOrderValue:  avgOrder,
          totalDiscount:  Number(salesAgg._sum.discount ?? 0),
          totalReturns:   returnAgg._count.id,
          totalRefunded:  Number(returnAgg._sum.refundAmount ?? 0),
          totalCustomers: customerCount,
          totalMedicines: medicineCount,
        },
        paymentBreakdown: paymentBreakdown.map((p) => ({
          method:  p.paymentMethod,
          count:   p._count.id,
          revenue: Number(p._sum.total ?? 0),
        })),
        topMedicines: topMedicines.map((m) => ({
          medicineId: m.medicineId,
          name:       m.medicineName,
          qty:        m._sum.quantity ?? 0,
          revenue:    Number(m._sum.total ?? 0),
        })),
        recentSales: recentSales.map((s) => ({
          id:            s.id,
          invoiceNumber: s.invoiceNumber,
          customerName:  s.customerName,
          total:         Number(s.total),
          discount:      Number(s.discount),
          paymentMethod: s.paymentMethod,
          status:        s.status,
          itemCount:     s.items.length,
          createdAt:     s.createdAt,
        })),
      },
    } satisfies ApiResponse);
  },
};
