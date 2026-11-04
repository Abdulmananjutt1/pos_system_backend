import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

<<<<<<< HEAD
import authRoutes           from "./routes/auth";
import medicineRoutes       from "./routes/medicines";
import customerRoutes       from "./routes/customers";
import supplierRoutes       from "./routes/suppliers";
import saleRoutes           from "./routes/sales";
import expenseRoutes        from "./routes/expenses";
import settingsRoutes       from "./routes/settings";
import dashboardRoutes      from "./routes/dashboard";
import reportRoutes         from "./routes/reports";
import loginHistoryRoutes   from "./routes/loginHistory";
import notificationRoutes   from "./routes/notifications";
import returnRoutes         from "./routes/returns";
import purchaseOrderRoutes  from "./routes/purchaseOrders";
import stockCountRoutes     from "./routes/stockCount";
import cashShiftRoutes      from "./routes/cashShifts";
import transferRoutes       from "./routes/transfers";
import permissionRoutes     from "./routes/permissions";
import { errorHandler }     from "./middleware/errorHandler";
=======
import authRoutes          from "./routes/auth";
import medicineRoutes      from "./routes/medicines";
import customerRoutes      from "./routes/customers";
import supplierRoutes      from "./routes/suppliers";
import saleRoutes          from "./routes/sales";
import expenseRoutes       from "./routes/expenses";
import settingsRoutes      from "./routes/settings";
import purchaseOrderRoutes from "./routes/purchaseOrders";
import stockTransferRoutes from "./routes/stockTransfers";
import returnRoutes        from "./routes/returns";
import reportRoutes        from "./routes/reports";
import dashboardRoutes     from "./routes/dashboard";
import cashShiftRoutes     from "./routes/cashShifts";
import { errorHandler } from "./middleware/errorHandler";
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

const app = express();

// ── Security & utility middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: "Too many login attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 500,
    message: { success: false, message: "Too many requests, please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
<<<<<<< HEAD
app.use("/api/auth",           authRoutes);
app.use("/api/medicines",      medicineRoutes);
app.use("/api/customers",      customerRoutes);
app.use("/api/suppliers",      supplierRoutes);
app.use("/api/sales",          saleRoutes);
app.use("/api/expenses",       expenseRoutes);
app.use("/api/settings",       settingsRoutes);
app.use("/api/dashboard",      dashboardRoutes);
app.use("/api/reports",        reportRoutes);
app.use("/api/login-history",  loginHistoryRoutes);
app.use("/api/notifications",  notificationRoutes);
app.use("/api/returns",        returnRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/stock-counts",   stockCountRoutes);
app.use("/api/cash-shifts",    cashShiftRoutes);
app.use("/api/transfers",      transferRoutes);
app.use("/api/permissions",    permissionRoutes);
=======
app.use("/api/auth",            authRoutes);
app.use("/api/medicines",       medicineRoutes);
app.use("/api/customers",       customerRoutes);
app.use("/api/suppliers",       supplierRoutes);
app.use("/api/sales",           saleRoutes);
app.use("/api/expenses",        expenseRoutes);
app.use("/api/settings",        settingsRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/transfers",       stockTransferRoutes);
app.use("/api/returns",         returnRoutes);
app.use("/api/reports",         reportRoutes);
app.use("/api/dashboard",       dashboardRoutes);
app.use("/api/cash-shifts",     cashShiftRoutes);
>>>>>>> b33efb41bced3b18c8e308854a04d36cce607b81

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
