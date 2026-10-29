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
      address:      "Shop 12, Main Market, Gulshan-e-Iqbal, Karachi",
      phone:        "021-34567890",
      taxRate:      0,
      invoicePrefix: "INV",
      currency:     "PKR",
    },
  });
  console.log("✅ App settings seeded");

  // ── Admin user ───────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where:  { email: "admin@pharmapos.com" },
    update: {},
    create: {
      name:         "Dr. Ahmed Ali",
      email:        "admin@pharmapos.com",
      passwordHash: adminHash,
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
      name:         "Fatima Malik",
      email:        "cashier@pharmapos.com",
      passwordHash: cashierHash,
      role:         "cashier",
    },
  });
  console.log("✅ Cashier user seeded");

  console.log("\n🎉 Seeding complete!");
  console.log("   Admin   → admin@pharmapos.com   / admin123");
  console.log("   Cashier → cashier@pharmapos.com / cashier123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
