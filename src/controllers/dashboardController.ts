import { Request, Response } from "express";
<<<<<<< HEAD
import prisma from "../config/db";
import { ApiResponse } from "../types";

type DateRange = "today" | "yesterday" | "7d" | "30d";

function getDateRange(range: DateRange): { from: Date; to: Date } {
  const now  = new Date();
  const to   = new Date(now);
  const from = new Date(now);

  switch (range) {
    case "today":
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case "7d":
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    default:
      from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

export const dashboardController = {
  async get(req: Request, res: Response): Promise<void> {
    const range = (req.query.range as DateRange) || "today";
    const { from, to } = getDateRange(range);

    const now             = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    // Run all queries in parallel
    const [
      salesAgg,
      cogsAgg,
      expenseAgg,
      uniqueCustomers,
      walkInCount,
      totalDiscountAgg,
      paymentBreakdown,
      topMedicines,
      inventoryCount,
      customerCount,
      lowStockItems,
      nearExpiryItems,
      recentSales,
      trendData,
    ] = await Promise.all([
      // Revenue & transaction count
      prisma.sale.aggregate({
        where:  { status: "Completed", createdAt: { gte: from, lte: to } },
        _count: { id: true },
        _sum:   { total: true, discount: true, tax: true },
      }),

      // COGS from sale items
      prisma.saleItem.aggregate({
        where: {
          sale: { status: "Completed", createdAt: { gte: from, lte: to } },
        },
        _sum: {
          total: true, // Approximate: use purchase price instead
        },
      }),

      // Expenses
      prisma.expense.aggregate({
        where:  { date: { gte: from, lte: to } },
        _sum:   { amount: true },
      }),

      // Unique customers (registered)
      prisma.sale.findMany({
        where:   { status: "Completed", createdAt: { gte: from, lte: to }, customerId: { not: null } },
        select:  { customerId: true },
        distinct: ["customerId"],
      }),

      // Walk-in count
      prisma.sale.count({
        where: { status: "Completed", createdAt: { gte: from, lte: to }, customerId: null },
      }),

      // Total discount
      prisma.sale.aggregate({
        where: { status: "Completed", createdAt: { gte: from, lte: to } },
        _sum:  { discount: true },
=======
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
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
      }),

      // Payment breakdown
      prisma.sale.groupBy({
        by:    ["paymentMethod"],
<<<<<<< HEAD
        where: { status: "Completed", createdAt: { gte: from, lte: to } },
=======
        where: salesFilter,
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
        _count: { id: true },
        _sum:   { total: true },
      }),

<<<<<<< HEAD
      // Top 5 medicines by revenue
      prisma.saleItem.groupBy({
        by:    ["medicineId", "medicineName"],
        where: { sale: { status: "Completed", createdAt: { gte: from, lte: to } } },
        _sum:   { quantity: true, total: true },
=======
      // Top 5 medicines by revenue in range
      prisma.saleItem.groupBy({
        by:      ["medicineId", "medicineName"],
        where:   { sale: salesFilter },
        _sum:    { total: true, quantity: true },
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
        orderBy: { _sum: { total: "desc" } },
        take:    5,
      }),

<<<<<<< HEAD
      // Inventory count
      prisma.medicine.count(),

      // Customer count
      prisma.customer.count(),

      // Low stock (top 5)
      prisma.medicine.findMany({
        where:   { stock: { lte: 10 } },
        orderBy: { stock: "asc" },
        take:    5,
        select:  { id: true, name: true, brand: true, batchNumber: true, stock: true, minStock: true, unit: true },
      }),

      // Near expiry (top 5 + expired)
      prisma.medicine.findMany({
        where:   { expiryDate: { lte: thirtyDaysAhead } },
        orderBy: { expiryDate: "asc" },
        take:    5,
        select:  { id: true, name: true, brand: true, batchNumber: true, expiryDate: true },
      }),

      // Recent sales (latest 5)
      prisma.sale.findMany({
        where:   { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "desc" },
        take:    5,
        include: { _count: { select: { items: true } } },
      }),

      // Sales trend
      prisma.sale.findMany({
        where:   { status: "Completed", createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "asc" },
        select:  { createdAt: true, total: true },
      }),
    ]);

    // Calculate COGS more accurately using purchase prices
    const saleItemsWithPrices = await prisma.saleItem.findMany({
      where: { sale: { status: "Completed", createdAt: { gte: from, lte: to } } },
      include: { medicine: { select: { purchasePrice: true } } },
    });
    const totalCOGS = saleItemsWithPrices.reduce(
      (sum, item) => sum + item.quantity * Number(item.medicine.purchasePrice),
      0
    );

    const totalRevenue   = Number(salesAgg._sum.total   ?? 0);
    const totalExpenses  = Number(expenseAgg._sum.amount ?? 0);
    const grossProfit    = totalRevenue - totalCOGS;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit      = grossProfit - totalExpenses;
    const txCount        = salesAgg._count.id;
    const avgBillValue   = txCount > 0 ? totalRevenue / txCount : 0;
    const totalDiscount  = Number(totalDiscountAgg._sum.discount ?? 0);

    // Alerts
    const outOfStockCount  = await prisma.medicine.count({ where: { stock: 0 } });
    const lowStockCount    = await prisma.medicine.count({ where: { stock: { gt: 0, lte: 10 } } });
    const expiringSoonCount = nearExpiryItems.filter((m) => new Date(m.expiryDate) >= now).length;
    const expiredCount      = nearExpiryItems.filter((m) => new Date(m.expiryDate) < now).length;

    // Build trend labels
    const trendMap = new Map<string, { revenue: number; transactions: number }>();
    for (const sale of trendData) {
      let label: string;
      if (range === "today" || range === "yesterday") {
        label = sale.createdAt.toLocaleTimeString("en-PK", { hour: "2-digit", hour12: true });
      } else {
        label = sale.createdAt.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
      }
      const existing = trendMap.get(label) ?? { revenue: 0, transactions: 0 };
      existing.revenue      += Number(sale.total);
      existing.transactions += 1;
      trendMap.set(label, existing);
    }
    const trend = Array.from(trendMap.entries()).map(([label, data]) => ({ label, ...data }));
=======
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
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          totalCOGS,
          grossProfit,
<<<<<<< HEAD
          grossMarginPct,
          totalExpenses,
          netProfit,
          totalTransactions:  txCount,
          avgBillValue,
          uniqueCustomers:    uniqueCustomers.length,
          walkInCount,
          totalDiscount,
        },
        alerts: {
          outOfStock:   outOfStockCount,
          lowStock:     lowStockCount,
          expiringSoon: expiringSoonCount,
          expired:      expiredCount,
          totalAlerts:  outOfStockCount + lowStockCount + expiringSoonCount + expiredCount,
        },
        paymentBreakdown: paymentBreakdown.map((p) => ({
          method: p.paymentMethod,
          count:  p._count.id,
          amount: Number(p._sum.total ?? 0),
=======
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
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
        })),
        topMedicines: topMedicines.map((m) => ({
          medicineId: m.medicineId,
          name:       m.medicineName,
<<<<<<< HEAD
          qty:        Number(m._sum.quantity ?? 0),
          revenue:    Number(m._sum.total    ?? 0),
        })),
        inventoryCounts: { total: inventoryCount, customers: customerCount },
        lowStockItems:   lowStockItems,
        nearExpiry: nearExpiryItems.map((m) => ({
          ...m,
          isExpired: new Date(m.expiryDate) < now,
=======
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
          createdAt:     s.createdAt,
        })),
        trend,
=======
          itemCount:     s.items.length,
          createdAt:     s.createdAt,
        })),
        // Daily trend for chart (last 7 or 30 days depending on range)
        trend: await buildTrend(range),
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
      },
    } satisfies ApiResponse);
  },
};
<<<<<<< HEAD
=======

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
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81
