import { Request, Response } from "express";
<<<<<<< HEAD
import prisma from "../config/db";
import { ApiResponse } from "../types";

export const reportController = {
  async getSummary(req: Request, res: Response): Promise<void> {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to   = req.query.to   ? new Date(req.query.to   as string) : undefined;

    const dateFilter = from || to
      ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
=======
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
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
      : {};

    const [
      salesAgg,
<<<<<<< HEAD
      returnsAgg,
      paymentBreakdown,
      topMedicinesRaw,
      totalCustomers,
      totalMedicines,
      recentSales,
    ] = await Promise.all([
      // Sales summary
=======
      paymentBreakdown,
      topMedicines,
      customerCount,
      medicineCount,
      returnAgg,
      recentSales,
    ] = await Promise.all([
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
      prisma.sale.aggregate({
        where:  { status: "Completed", ...dateFilter },
        _count: { id: true },
        _sum:   { total: true, discount: true },
      }),

<<<<<<< HEAD
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
=======
      prisma.sale.groupBy({
        by:     ["paymentMethod"],
        where:  { status: "Completed", ...dateFilter },
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
        _count: { id: true },
        _sum:   { total: true },
      }),

<<<<<<< HEAD
      // Top medicines by revenue
      prisma.saleItem.groupBy({
        by:    ["medicineId", "medicineName"],
        where: { sale: { status: "Completed", ...dateFilter } },
        _sum:   { quantity: true, total: true },
=======
      prisma.saleItem.groupBy({
        by:      ["medicineId", "medicineName"],
        where:   { sale: { status: "Completed", ...dateFilter } },
        _sum:    { total: true, quantity: true },
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
        orderBy: { _sum: { total: "desc" } },
        take:    10,
      }),

      prisma.customer.count(),
<<<<<<< HEAD
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
=======

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
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalSales,
<<<<<<< HEAD
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
=======
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
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
        })),
        recentSales: recentSales.map((s) => ({
          id:            s.id,
          invoiceNumber: s.invoiceNumber,
          customerName:  s.customerName,
          total:         Number(s.total),
          discount:      Number(s.discount),
          paymentMethod: s.paymentMethod,
          status:        s.status,
<<<<<<< HEAD
          itemCount:     s._count.items,
=======
          itemCount:     s.items.length,
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
          createdAt:     s.createdAt,
        })),
      },
    } satisfies ApiResponse);
  },
};
