import { Request, Response } from "express";
import { ApiResponse } from "../types";
import prisma from "../config/db";
import { Prisma } from "@prisma/client";

function getDateBounds(range: string): { from: Date; to: Date } {
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOf   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (range) {
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { from: startOf(y), to: endOf(y) };
    }
    case "7d": {
      const f = new Date(now); f.setDate(f.getDate() - 6);
      return { from: startOf(f), to: endOf(now) };
    }
    case "30d": {
      const f = new Date(now); f.setDate(f.getDate() - 29);
      return { from: startOf(f), to: endOf(now) };
    }
    default: // "today"
      return { from: startOf(now), to: endOf(now) };
  }
}

export const dashboardController = {
  async getData(req: Request, res: Response): Promise<void> {
    const range  = (req.query.range as string) ?? "today";
    const { from, to } = getDateBounds(range);

    const salesFilter: Prisma.SaleWhereInput = {
      status:    "Completed",
      createdAt: { gte: from, lte: to },
    };
    const expenseFilter: Prisma.ExpenseWhereInput = {
      date: { gte: from, lte: to },
    };

    const [
      salesAgg,
      salesInRange,
      paymentBreakdown,
      topMedicines,
      expensesAgg,
      allMedicines,
      customerCount,
      nearExpiry,
      recentSales,
    ] = await Promise.all([
      // Revenue & discount totals
      prisma.sale.aggregate({
        where: salesFilter,
        _count: { id: true },
        _sum:   { total: true, discount: true },
      }),

      // Full sales with items for COGS + unique customers
      prisma.sale.findMany({
        where:   salesFilter,
        include: { items: { include: { medicine: { select: { purchasePrice: true } } } } },
      }),

      // Payment breakdown
      prisma.sale.groupBy({
        by:    ["paymentMethod"],
        where: salesFilter,
        _count: { id: true },
        _sum:   { total: true },
      }),

      // Top 5 medicines by revenue in range
      prisma.saleItem.groupBy({
        by:      ["medicineId", "medicineName"],
        where:   { sale: salesFilter },
        _sum:    { total: true, quantity: true },
        orderBy: { _sum: { total: "desc" } },
        take:    5,
      }),

      // Expenses in range
      prisma.expense.aggregate({
        where: expenseFilter,
        _sum:  { amount: true },
      }),

      // All medicines for inventory alerts + COGS calc
      prisma.medicine.findMany({
        select: {
          id: true, name: true, brand: true, batchNumber: true,
          stock: true, minStock: true, expiryDate: true,
          purchasePrice: true, sellingPrice: true,
        },
      }),

      // Total customers
      prisma.customer.count(),

      // Expiring / expired medicines (next 30 days)
      prisma.medicine.findMany({
        where: {
          expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
        select: {
          id: true, name: true, brand: true, batchNumber: true, expiryDate: true,
        },
        orderBy: { expiryDate: "asc" },
        take: 10,
      }),

      // Recent 6 sales (any status) for the range
      prisma.sale.findMany({
        where:   { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "desc" },
        take:    6,
        include: { items: true },
      }),
    ]);

    // ── Calculate KPIs ──────────────────────────────────────────────────────
    const totalRevenue = Number(salesAgg._sum.total    ?? 0);
    const totalSales   = salesAgg._count.id;
    const avgBill      = totalSales > 0 ? totalRevenue / totalSales : 0;

    // COGS from sale items × purchase price
    let totalCOGS = 0;
    const uniqueCustomers = new Set<string>();
    let walkInCount = 0;
    salesInRange.forEach((s) => {
      if (s.customerId) uniqueCustomers.add(s.customerId);
      else walkInCount++;
      s.items.forEach((i) => {
        totalCOGS += Number(i.medicine?.purchasePrice ?? 0) * i.quantity;
      });
    });

    const grossProfit  = totalRevenue - totalCOGS;
    const totalExpenses = Number(expensesAgg._sum.amount ?? 0);
    const netProfit    = grossProfit - totalExpenses;

    // Inventory alerts
    const now = new Date();
    const outOfStock   = allMedicines.filter((m) => m.stock === 0).length;
    const lowStock     = allMedicines.filter((m) => m.stock > 0 && m.stock <= m.minStock).length;
    const expired      = allMedicines.filter((m) => new Date(m.expiryDate) < now).length;
    const expiringSoon = allMedicines.filter((m) => {
      const diff = (new Date(m.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    }).length;

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          totalCOGS,
          grossProfit,
          grossMarginPct: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          totalExpenses,
          netProfit,
          totalTransactions: totalSales,
          avgBillValue: avgBill,
          uniqueCustomers: uniqueCustomers.size,
          walkInCount,
          totalDiscount: Number(salesAgg._sum.discount ?? 0),
        },
        alerts: { outOfStock, lowStock, expiringSoon, expired, totalAlerts: outOfStock + lowStock + expiringSoon + expired },
        paymentBreakdown: paymentBreakdown.map((p) => ({
          method:  p.paymentMethod,
          count:   p._count.id,
          amount:  Number(p._sum.total ?? 0),
        })),
        topMedicines: topMedicines.map((m) => ({
          medicineId: m.medicineId,
          name:       m.medicineName,
          qty:        m._sum.quantity ?? 0,
          revenue:    Number(m._sum.total ?? 0),
        })),
        inventoryCounts: {
          total:     allMedicines.length,
          customers: customerCount,
        },
        nearExpiry: nearExpiry.map((m) => ({
          id:          m.id,
          name:        m.name,
          brand:       m.brand,
          batchNumber: m.batchNumber,
          expiryDate:  m.expiryDate,
          isExpired:   new Date(m.expiryDate) < now,
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
        // Daily trend for chart (last 7 or 30 days depending on range)
        trend: await buildTrend(range),
      },
    } satisfies ApiResponse);
  },
};

async function buildTrend(range: string) {
  const days = range === "30d" ? 30 : range === "7d" ? 7 : 1;
  const now  = new Date();

  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  // Single query — get all sales in range grouped by date
  const sales = await prisma.sale.findMany({
    where:   { status: "Completed", createdAt: { gte: from, lte: now } },
    select:  { total: true, createdAt: true },
  });

  // Build day buckets
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d     = new Date(now); d.setDate(d.getDate() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

    const daySales = sales.filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= start && t <= end;
    });

    result.push({
      label:        d.toLocaleDateString("en-PK", { month: "short", day: "numeric" }),
      revenue:      daySales.reduce((sum, s) => sum + Number(s.total), 0),
      transactions: daySales.length,
    });
  }
  return result;
}
