import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── App Settings ────────────────────────────────────────────────────────────
  await prisma.appSettings.upsert({
    where:  { id: 1 },
    update: {},
    create: {
      id:           1,
      pharmacyName: "Al-Shifa Pharmacy",
      address:      "Main Market, Karachi",
      phone:        "021-12345678",
      taxRate:      0,
      invoicePrefix:"INV",
      currency:     "PKR",
    },
  });
  console.log("✅ App settings seeded");

  // ── Admin user ───────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where:  { email: "admin@pharmapos.com" },
    update: {},
    create: {
      name:         "Admin",
      email:        "admin@pharmapos.com",
      passwordHash,
      role:         "admin",
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ── Cashier user ─────────────────────────────────────────────────────────────
  const cashierHash = await bcrypt.hash("cashier123", 12);
  await prisma.user.upsert({
    where:  { email: "cashier@pharmapos.com" },
    update: {},
    create: {
      name:         "Cashier",
      email:        "cashier@pharmapos.com",
      passwordHash: cashierHash,
      role:         "cashier",
    },
  });
  console.log("✅ Cashier user seeded");

  // ── Supplier ─────────────────────────────────────────────────────────────────
  const supplier = await prisma.supplier.upsert({
    where:  { id: "sup-001" },
    update: {},
    create: {
      id:            "sup-001",
      name:          "MedLine Distributors",
      contactPerson: "Ahmed Raza",
      phone:         "0300-1234567",
      email:         "medline@example.com",
      address:       "Industrial Area, Karachi",
    },
  });
  console.log(`✅ Supplier: ${supplier.name}`);

  // ── Medicines ────────────────────────────────────────────────────────────────
  const medicines = [
    {
      name: "Panadol Extra", genericName: "Paracetamol + Caffeine",
      brand: "GSK", category: "Tablet" as const,
      batchNumber: "BT-001", expiryDate: new Date("2026-12-31"),
      purchasePrice: 15, sellingPrice: 22, stock: 200, minStock: 30,
      unit: "Strip", supplierId: supplier.id,
    },
    {
      name: "Brufen 400mg", genericName: "Ibuprofen",
      brand: "Abbott", category: "Tablet" as const,
      batchNumber: "BT-002", expiryDate: new Date("2026-06-30"),
      purchasePrice: 35, sellingPrice: 50, stock: 150, minStock: 20,
      unit: "Strip", supplierId: supplier.id,
    },
    {
      name: "Augmentin 625mg", genericName: "Amoxicillin + Clavulanate",
      brand: "GSK", category: "Tablet" as const,
      batchNumber: "BT-003", expiryDate: new Date("2025-09-30"),
      purchasePrice: 120, sellingPrice: 165, stock: 8, minStock: 15,
      unit: "Strip", supplierId: supplier.id, requiresPrescription: true,
    },
    {
      name: "Ventolin Inhaler", genericName: "Salbutamol",
      brand: "GSK", category: "Inhaler" as const,
      batchNumber: "BT-004", expiryDate: new Date("2026-03-31"),
      purchasePrice: 180, sellingPrice: 240, stock: 25, minStock: 10,
      unit: "Pcs", supplierId: supplier.id, requiresPrescription: true,
    },
    {
      name: "ORS Sachet", genericName: "Oral Rehydration Salts",
      brand: "Sanofi", category: "Supplement" as const,
      batchNumber: "BT-005", expiryDate: new Date("2027-01-31"),
      purchasePrice: 8, sellingPrice: 12, stock: 500, minStock: 50,
      unit: "Sachet", supplierId: supplier.id,
    },
  ];

  for (const med of medicines) {
    await prisma.medicine.upsert({
      where:  { id: `med-${med.batchNumber}` },
      update: {},
      create: { id: `med-${med.batchNumber}`, ...med },
    });
  }
  console.log(`✅ ${medicines.length} medicines seeded`);

  // ── Customer ─────────────────────────────────────────────────────────────────
  await prisma.customer.upsert({
    where:  { id: "cus-001" },
    update: {},
    create: {
      id: "cus-001", name: "Ali Hassan",
      phone: "0311-1234567", email: "ali@example.com",
    },
  });
  console.log("✅ Sample customer seeded");

  console.log("\n🎉 Seeding complete!");
  console.log("   Admin   → admin@pharmapos.com   / admin123");
  console.log("   Cashier → cashier@pharmapos.com / cashier123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
