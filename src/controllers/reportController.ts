import { Request, Response } from "express";
import prisma from "../config/db";
import { ApiResponse } from "../types";

export const reportController = {
  async getSummary(req: Request, res: Response): Promise<void> {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to   = req.query.to   ? new Date(req.query.to   as string) : undefined;

    const dateFilter = from || to
      ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : {};

    const [
      salesAgg,
      returnsAgg,
      paymentBreakdown,
      topMedicinesRaw,
      totalCustomers,
      totalMedicines,
      recentSales,
    ] = await Promise.all([
      // Sales summary
      prisma.sale.aggregate({
        where:  { status: "Completed", ...dateFilter },
        _count: { id: true },
        _sum:   { total: true, discount: true },
      }),

      // Returns summary
      prisma.saleReturn.aggregate({
        where: from || to
          ? { returnDate: { ...(from && { gte: from }), ...(to && { lte: to }) } }
          : {},
        _count: { id: true },
        _sum:   { refundAmount: true },
      }),

      // Payment breakdown
      prisma.sale.groupBy({
        by:    ["paymentMethod"],
        where: { status: "Completed", ...dateFilter },
        _count: { id: true },
        _sum:   { total: true },
      }),

      // Top medicines by revenue
      prisma.saleItem.groupBy({
        by:    ["medicineId", "medicineName"],
        where: { sale: { status: "Completed", ...dateFilter } },
        _sum:   { quantity: true, total: true },
        orderBy: { _sum: { total: "desc" } },
        take:    10,
      }),

      prisma.customer.count(),
      prisma.medicine.count(),

      // Recent transactions
      prisma.sale.findMany({
        where:   dateFilter,
        orderBy: { createdAt: "desc" },
        take:    50,
        include: { _count: { select: { items: true } } },
      }),
    ]);

    const totalRevenue  = Number(salesAgg._sum.total      ?? 0);
    const totalSales    = salesAgg._count.id;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const totalDiscount = Number(salesAgg._sum.discount   ?? 0);
    const totalReturns  = returnsAgg._count.id;
    const totalRefunded = Number(returnsAgg._sum.refundAmount ?? 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalSales,
          avgOrderValue,
          totalDiscount,
          totalReturns,
          totalRefunded,
          totalCustomers,
          totalMedicines,
        },
        paymentBreakdown: paymentBreakdown.map((p) => ({
          method: p.paymentMethod,
          count:  p._count.id,
          revenue: Number(p._sum.total ?? 0),
        })),
        topMedicines: topMedicinesRaw.map((m) => ({
          medicineId: m.medicineId,
          name:       m.medicineName,
          qty:        Number(m._sum.quantity ?? 0),
          revenue:    Number(m._sum.total    ?? 0),
        })),
        recentSales: recentSales.map((s) => ({
          id:            s.id,
          invoiceNumber: s.invoiceNumber,
          customerName:  s.customerName,
          total:         Number(s.total),
          discount:      Number(s.discount),
          paymentMethod: s.paymentMethod,
          status:        s.status,
          itemCount:     s._count.items,
          createdAt:     s.createdAt,
        })),
      },
    } satisfies ApiResponse);
  },
};
