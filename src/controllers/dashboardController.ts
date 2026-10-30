import { Request, Response } from "express";
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
      }),

      // Payment breakdown
      prisma.sale.groupBy({
        by:    ["paymentMethod"],
        where: { status: "Completed", createdAt: { gte: from, lte: to } },
        _count: { id: true },
        _sum:   { total: true },
      }),

      // Top 5 medicines by revenue
      prisma.saleItem.groupBy({
        by:    ["medicineId", "medicineName"],
        where: { sale: { status: "Completed", createdAt: { gte: from, lte: to } } },
        _sum:   { quantity: true, total: true },
        orderBy: { _sum: { total: "desc" } },
        take:    5,
      }),

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

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          totalCOGS,
          grossProfit,
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
        })),
        topMedicines: topMedicines.map((m) => ({
          medicineId: m.medicineId,
          name:       m.medicineName,
          qty:        Number(m._sum.quantity ?? 0),
          revenue:    Number(m._sum.total    ?? 0),
        })),
        inventoryCounts: { total: inventoryCount, customers: customerCount },
        lowStockItems:   lowStockItems,
        nearExpiry: nearExpiryItems.map((m) => ({
          ...m,
          isExpired: new Date(m.expiryDate) < now,
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
        trend,
      },
    } satisfies ApiResponse);
  },
};
