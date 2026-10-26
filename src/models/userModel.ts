import prisma from "../config/db";
import { Prisma, User } from "@prisma/client";

export const UserModel = {
  findByEmail: (email: string) =>
    prisma.user.findFirst({ where: { email, isActive: true } }),

  findById: (id: string) =>
    prisma.user.findFirst({ where: { id, isActive: true } }),

  create: (data: Prisma.UserCreateInput) =>
    prisma.user.create({ data }),

  findAll: () =>
    prisma.user.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),

  deactivate: (id: string) =>
    prisma.user.update({ where: { id }, data: { isActive: false } }),
};

export type SafeUser = Omit<User, "passwordHash">;
