import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

interface ShiftEntry {
  id: string;
  description: string;
  amount: number;
  type: "in" | "out";
  createdAt: string;
}

interface CashShift {
  id: string;
  shiftNumber: string;
  openedBy: string;
  closedBy?: string;
  openTime: string;
  closeTime?: string;
  openingBalance: number;
  closingBalance?: number;
  expectedCash?: number;
  variance?: number;
  status: "Open" | "Closed";
  notes?: string;
  entries: ShiftEntry[];
}

let activeShift: CashShift | null = null;
const shiftHistory: CashShift[] = [];

router.get("/current", (_req: Request, res: Response) => {
  res.json({ success: true, data: activeShift });
});

router.post("/open", (req: Request, res: Response) => {
  const openingBalance = Number(req.body.openingBalance ?? 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  activeShift = {
    id: `SHF-${Date.now()}`,
    shiftNumber: `SHF-${String(Date.now()).slice(-6)}`,
    openedBy: user?.name || "Cashier Staff",
    openTime: new Date().toISOString(),
    openingBalance,
    status: "Open",
    entries: [],
  };
  res.status(201).json({ success: true, message: "Shift opened", data: activeShift });
});

router.patch("/:id/close", (req: Request, res: Response) => {
  const closingBalance = Number(req.body.closingBalance ?? 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  if (!activeShift) {
    res.status(400).json({ success: false, message: "No active shift found" });
    return;
  }
  activeShift.closingBalance = closingBalance;
  activeShift.closedBy = user?.name || "Cashier Staff";
  activeShift.closeTime = new Date().toISOString();
  activeShift.status = "Closed";
  activeShift.notes = req.body.notes;

  shiftHistory.push(activeShift);
  const closed = activeShift;
  activeShift = null;
  res.json({ success: true, message: "Shift closed", data: closed });
});

router.post("/:id/entries", (req: Request, res: Response) => {
  const { description, amount, type } = req.body;
  const entry: ShiftEntry = {
    id: `ENT-${Date.now()}`,
    description: description || "Adjustment",
    amount: Number(amount || 0),
    type: type === "out" ? "out" : "in",
    createdAt: new Date().toISOString(),
  };
  if (activeShift) {
    activeShift.entries.push(entry);
  }
  res.status(201).json({ success: true, message: "Entry added", data: entry });
});

export default router;

