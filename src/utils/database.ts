import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("Connected to PostgreSQL");
  } catch (error) {
    logger.error({ err: error }, "Failed to connect to PostgreSQL");
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Disconnected from PostgreSQL");
}
