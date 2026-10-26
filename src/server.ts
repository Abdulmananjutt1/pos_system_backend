import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import prisma from "./config/db";

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  await prisma.$connect();
  console.log("✅ Database connected via Prisma");

  app.listen(PORT, () => {
    console.log(`🚀 PharmaPOS API  →  http://localhost:${PORT}`);
    console.log(`   Health check   →  http://localhost:${PORT}/health`);
    console.log(`   Environment    →  ${process.env.NODE_ENV ?? "development"}`);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
