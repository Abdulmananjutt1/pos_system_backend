import { Router, Request, Response } from "express";
import crypto from "crypto";
import { authenticate } from "../middleware/auth";
import prisma from "../config/db";

const router = Router();
router.use(authenticate);

interface DbTransferRow {
  id: string;
  transfer_number: string;
  transfer_type: "Internal" | "ExternalOut" | "ExternalIn";
  from_branch: string;
  to_branch: string;
  external_pharmacy: string | null;
  external_phone: string | null;
  contact_person: string | null;
  settlement_type: string | null;
  settled_amount: string | number | null;
  transfer_date: Date;
  receive_date: Date | null;
  settled_date: Date | null;
  status: "Pending" | "InTransit" | "Received" | "Returned" | "PaidCash" | "Rejected";
  notes: string | null;
  initiated_by: string;
  created_at: Date;
  updated_at: Date;
}

interface DbItemRow {
  id: string;
  transfer_id: string;
  medicine_id: string | null;
  medicine_name: string;
  quantity: number;
  unit_price: string | number;
  total: string | number;
  batch_number: string | null;
  expiry_date: Date | null;
}

function mapTransferResponse(row: DbTransferRow, items: DbItemRow[]) {
  return {
    id: row.id,
    transferNumber: row.transfer_number,
    transferType: row.transfer_type,
    fromBranch: row.from_branch,
    toBranch: row.to_branch,
    externalPharmacy: row.external_pharmacy ?? undefined,
    externalPhone: row.external_phone ?? undefined,
    contactPerson: row.contact_person ?? undefined,
    settlementType: (row.settlement_type ?? "StockReturn") as "StockReturn" | "Cash",
    settledAmount: row.settled_amount != null ? Number(row.settled_amount) : undefined,
    transferDate: row.transfer_date ? row.transfer_date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    receiveDate: row.receive_date ? row.receive_date.toISOString() : undefined,
    settledDate: row.settled_date ? row.settled_date.toISOString() : undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    initiatedBy: row.initiated_by,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    items: items.map((it) => ({
      id: it.id,
      medicineId: it.medicine_id ?? "",
      medicineName: it.medicine_name,
      quantity: Number(it.quantity ?? 1),
      unitPrice: Number(it.unit_price ?? 0),
      total: Number(it.total ?? Number(it.quantity ?? 1) * Number(it.unit_price ?? 0)),
      batchNumber: it.batch_number ?? undefined,
      expiryDate: it.expiry_date ? it.expiry_date.toISOString().split("T")[0] : undefined,
    })),
  };
}

// ── GET /api/transfers ────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const { search, type, status, page = 1, limit = 10 } = req.query;

  try {
    const rows = await prisma.$queryRawUnsafe<DbTransferRow[]>(
      `SELECT * FROM stock_transfers ORDER BY created_at DESC`
    );

    let filtered = rows;
    if (type && type !== "All") {
      filtered = filtered.filter((r) => r.transfer_type === type);
    }
    if (status && status !== "All") {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.transfer_number.toLowerCase().includes(q) ||
          (r.external_pharmacy && r.external_pharmacy.toLowerCase().includes(q)) ||
          (r.contact_person && r.contact_person.toLowerCase().includes(q)) ||
          (r.from_branch && r.from_branch.toLowerCase().includes(q)) ||
          (r.to_branch && r.to_branch.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const total = filtered.length;
    const totalPages = Math.ceil(total / l) || 1;
    const paginated = filtered.slice((p - 1) * l, p * l);

    // Fetch items for paginated transfers
    const transferIds = paginated.map((r) => r.id);
    let items: DbItemRow[] = [];
    if (transferIds.length > 0) {
      const inClause = transferIds.map((id) => `'${id}'`).join(",");
      items = await prisma.$queryRawUnsafe<DbItemRow[]>(
        `SELECT * FROM stock_transfer_items WHERE transfer_id IN (${inClause})`
      );
    }

    const itemMap = new Map<string, DbItemRow[]>();
    for (const item of items) {
      const arr = itemMap.get(item.transfer_id) || [];
      arr.push(item);
      itemMap.set(item.transfer_id, arr);
    }

    const results = paginated.map((r) => mapTransferResponse(r, itemMap.get(r.id) || []));

    res.json({
      success: true,
      data: {
        items: results,
        total,
        page: p,
        totalPages,
      },
      items: results,
      total,
      page: p,
      totalPages,
    });
  } catch (err: any) {
    console.error("Failed to query stock_transfers from PostgreSQL:", err);
    res.status(500).json({ success: false, message: "Database error fetching transfers" });
  }
});

// ── POST /api/transfers ───────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  const body = req.body;

  try {
    const id = crypto.randomUUID();
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT count(*) FROM stock_transfers`
    );
    const seq = Number(countResult[0]?.count ?? 0) + 1;
    const yearShort = String(new Date().getFullYear()).slice(-2);
    const transferNumber =
      body.transferNumber || `TRF-${yearShort}${String(seq).padStart(4, "0")}`;

    const transferType = body.transferType || "ExternalIn";
    const fromBranch = body.fromBranch || (transferType === "ExternalIn" ? body.externalPharmacy : "Main Pharmacy");
    const toBranch = body.toBranch || (transferType === "ExternalOut" ? body.externalPharmacy : "Main Pharmacy");
    const externalPharmacy = body.externalPharmacy || null;
    const externalPhone = body.externalPhone || null;
    const contactPerson = body.contactPerson || null;
    const settlementType = body.settlementType || "StockReturn";
    const status = body.status || "Pending";
    const notes = body.notes || null;
    const initiatedBy = body.initiatedBy || user?.name || "Admin Staff";

    // 1. Insert into stock_transfers
    await prisma.$executeRawUnsafe(
      `INSERT INTO stock_transfers (
        id, transfer_number, transfer_type, from_branch, to_branch,
        external_pharmacy, external_phone, contact_person, settlement_type,
        status, notes, initiated_by, transfer_date, created_at, updated_at
      ) VALUES (
        $1, $2, $3::"TransferType", $4, $5,
        $6, $7, $8, $9,
        $10::"TransferStatus", $11, $12, NOW(), NOW(), NOW()
      )`,
      id,
      transferNumber,
      transferType,
      fromBranch,
      toBranch,
      externalPharmacy,
      externalPhone,
      contactPerson,
      settlementType,
      status,
      notes,
      initiatedBy
    );

    // 2. Insert items and adjust medicine inventory in PostgreSQL
    const items = body.items || [];
    const insertedItems: DbItemRow[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const itemId = crypto.randomUUID();
      const medId = it.medicineId && it.medicineId.length > 5 ? it.medicineId : null;
      const medName = it.medicineName || "Medicine";
      const quantity = Math.max(1, Number(it.quantity || 1));
      const unitPrice = Number(it.unitPrice || 0);
      const total = quantity * unitPrice;

      await prisma.$executeRawUnsafe(
        `INSERT INTO stock_transfer_items (
          id, transfer_id, medicine_id, medicine_name, quantity, unit_price, total
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )`,
        itemId,
        id,
        medId,
        medName,
        quantity,
        unitPrice,
        total
      );

      insertedItems.push({
        id: itemId,
        transfer_id: id,
        medicine_id: medId,
        medicine_name: medName,
        quantity,
        unit_price: unitPrice,
        total,
        batch_number: null,
        expiry_date: null,
      });

      // Update medicine inventory
      if (medId) {
        if (transferType === "ExternalIn") {
          // Borrowed from outside: increase our inventory stock
          await prisma.medicine.updateMany({
            where: { id: medId },
            data: { stock: { increment: quantity } },
          });
        } else if (transferType === "ExternalOut") {
          // Lent out to partner: decrease our inventory stock
          await prisma.medicine.updateMany({
            where: { id: medId },
            data: { stock: { decrement: quantity } },
          });
        }
      }
    }

    const createdRow: DbTransferRow = {
      id,
      transfer_number: transferNumber,
      transfer_type: transferType,
      from_branch: fromBranch,
      to_branch: toBranch,
      external_pharmacy: externalPharmacy,
      external_phone: externalPhone,
      contact_person: contactPerson,
      settlement_type: settlementType,
      settled_amount: null,
      transfer_date: new Date(),
      receive_date: null,
      settled_date: null,
      status: status,
      notes,
      initiated_by: initiatedBy,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const formatted = mapTransferResponse(createdRow, insertedItems);

    res.status(201).json({
      success: true,
      message: "Transfer recorded in database",
      data: formatted,
      ...formatted,
    });
  } catch (err: any) {
    console.error("Failed to insert stock transfer into PostgreSQL:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to save transfer" });
  }
});

// ── PATCH /api/transfers/:id/status ──────────────────────────────────────────
router.patch("/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, settledType, settledAmount, notes } = req.body;

  try {
    const existing = await prisma.$queryRawUnsafe<DbTransferRow[]>(
      `SELECT * FROM stock_transfers WHERE id = $1`,
      id
    );
    if (!existing || existing.length === 0) {
      res.status(404).json({ success: false, message: "Transfer record not found" });
      return;
    }

    const current = existing[0];
    const oldStatus = current.status;

    await prisma.$executeRawUnsafe(
      `UPDATE stock_transfers 
       SET status = $1::"TransferStatus",
           settlement_type = COALESCE($2, settlement_type),
           settled_amount = COALESCE($3, settled_amount),
           settled_date = CASE WHEN $1 IN ('Returned', 'PaidCash', 'Received') THEN NOW() ELSE settled_date END,
           notes = CASE WHEN $4 IS NOT NULL THEN COALESCE(notes || ' | ', '') || $4 ELSE notes END,
           updated_at = NOW()
       WHERE id = $5`,
      status,
      settledType ?? null,
      settledAmount != null ? Number(settledAmount) : null,
      notes ?? null,
      id
    );

    // Fetch items to adjust live medicine stock on return
    const items = await prisma.$queryRawUnsafe<DbItemRow[]>(
      `SELECT * FROM stock_transfer_items WHERE transfer_id = $1`,
      id
    );

    // If ExternalOut was pending and is now Returned: restore medicine stock in PostgreSQL
    if (current.transfer_type === "ExternalOut" && oldStatus === "Pending" && status === "Returned") {
      for (const it of items) {
        if (it.medicine_id) {
          await prisma.medicine.updateMany({
            where: { id: it.medicine_id },
            data: { stock: { increment: Number(it.quantity) } },
          });
        }
      }
    }

    // If ExternalIn was pending and is now Returned: deduct replacement medicine stock
    if (current.transfer_type === "ExternalIn" && oldStatus === "Pending" && status === "Returned") {
      for (const it of items) {
        if (it.medicine_id) {
          await prisma.medicine.updateMany({
            where: { id: it.medicine_id },
            data: { stock: { decrement: Number(it.quantity) } },
          });
        }
      }
    }

    const updated = await prisma.$queryRawUnsafe<DbTransferRow[]>(
      `SELECT * FROM stock_transfers WHERE id = $1`,
      id
    );

    const formatted = mapTransferResponse(updated[0], items);

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: formatted,
      ...formatted,
    });
  } catch (err: any) {
    console.error("Failed to update transfer status in PostgreSQL:", err);
    res.status(500).json({ success: false, message: "Database update error" });
  }
});

// ── POST /api/transfers/:id/receive ──────────────────────────────────────────
router.post("/:id/receive", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE stock_transfers 
       SET status = 'Received'::"TransferStatus",
           receive_date = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      id
    );

    const items = await prisma.$queryRawUnsafe<DbItemRow[]>(
      `SELECT * FROM stock_transfer_items WHERE transfer_id = $1`,
      id
    );

    for (const it of items) {
      if (it.medicine_id) {
        await prisma.medicine.updateMany({
          where: { id: it.medicine_id },
          data: { stock: { increment: Number(it.quantity) } },
        });
      }
    }

    const updated = await prisma.$queryRawUnsafe<DbTransferRow[]>(
      `SELECT * FROM stock_transfers WHERE id = $1`,
      id
    );

    const formatted = mapTransferResponse(updated[0], items);

    res.json({
      success: true,
      message: "Transfer received and stock added",
      data: formatted,
      ...formatted,
    });
  } catch (err: any) {
    console.error("Failed to receive transfer in PostgreSQL:", err);
    res.status(500).json({ success: false, message: "Database receive error" });
  }
});

export default router;
