import { prisma } from "../../utils/database";
import { lookupQueue } from "../../jobs/queue";
import { validateGSTIN } from "../gst/gst.validator";
import { logger } from "../../utils/logger";
import { AppError } from "../../middleware/error-handler";
import { env } from "../../config/env";
import IORedis from "ioredis";

const redis = new IORedis(env.REDIS_URL, { lazyConnect: true });

export async function createLookup(gstin: string): Promise<{ lookupId: string; status: string }> {
  const validation = validateGSTIN(gstin);

  if (!validation.valid || !validation.normalizedGSTIN) {
    throw new AppError(400, validation.error || "Invalid GSTIN", "INVALID_GSTIN");
  }

  const normalized = validation.normalizedGSTIN;

  const cacheKey = `lookup:${normalized}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const lookup = JSON.parse(cached);
      return { lookupId: lookup.id, status: lookup.status };
    }
  } catch (error) {
    logger.warn({ gstin: normalized, err: error }, "Redis cache read failed");
  }

  const existingPending = await prisma.lookup.findFirst({
    where: { gstin: normalized, status: "pending" },
    orderBy: { createdAt: "desc" },
  });

  if (existingPending) {
    const ageMs = Date.now() - existingPending.createdAt.getTime();
    if (ageMs < 2 * 60 * 1000) {
      return { lookupId: existingPending.id, status: existingPending.status };
    }
    await prisma.lookup.update({
      where: { id: existingPending.id },
      data: { status: "failed", error: "Previous lookup request timed out" },
    });
  }

  const recentCompleted = await prisma.lookup.findFirst({
    where: {
      gstin: normalized,
      status: "completed",
      completedAt: {
        gte: new Date(Date.now() - env.LOOKUP_CACHE_TTL * 1000),
      },
    },
    orderBy: { completedAt: "desc" },
  });

  if (recentCompleted) {
    return { lookupId: recentCompleted.id, status: recentCompleted.status };
  }

  const lookup = await prisma.lookup.create({
    data: {
      gstin: normalized,
      status: "pending",
    },
  });

  await lookupQueue.add(
    "lookup",
    { lookupId: lookup.id, gstin: normalized },
    {
      jobId: `lookup-${normalized}-${Date.now()}`,
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 3600 },
    }
  );

  try {
    await redis.set(
      cacheKey,
      JSON.stringify({ id: lookup.id, status: "pending" }),
      "EX",
      3600
    );
  } catch (error) {
    logger.warn({ gstin: normalized, err: error }, "Redis cache write failed");
  }

  return { lookupId: lookup.id, status: "pending" };
}

export async function getLookup(lookupId: string) {
  const lookup = await prisma.lookup.findUnique({
    where: { id: lookupId },
  });

  if (!lookup) {
    throw new AppError(404, "Lookup not found", "NOT_FOUND");
  }

  if (lookup.status === "completed" && lookup.result) {
    return {
      status: lookup.status,
      ...(lookup.result as any),
    };
  }

  if (lookup.status === "failed") {
    return {
      status: "failed",
      error: lookup.error || "Lookup failed",
      result: lookup.result,
    };
  }

  return {
    status: lookup.status,
    lookupId: lookup.id,
    gstin: lookup.gstin,
  };
}

export async function getBusinessByGSTIN(gstin: string) {
  const validation = validateGSTIN(gstin);

  if (!validation.valid || !validation.normalizedGSTIN) {
    throw new AppError(400, validation.error || "Invalid GSTIN", "INVALID_GSTIN");
  }

  const business = await prisma.business.findUnique({
    where: { gstin: validation.normalizedGSTIN },
    include: {
      contacts: {
        include: {
          sources: true,
        },
      },
    },
  });

  if (!business) {
    throw new AppError(404, "Business not found in cache", "BUSINESS_NOT_FOUND");
  }

  const phones = business.contacts
    .filter((c) => c.type === "phone")
    .map((c) => ({
      number: c.normalizedValue,
      confidence: c.confidence,
      sources: c.sources.map((s) => ({ type: s.sourceType, url: s.sourceUrl })),
    }));

  const emails = business.contacts
    .filter((c) => c.type === "email")
    .map((c) => ({
      email: c.normalizedValue,
      confidence: c.confidence,
      sources: c.sources.map((s) => ({ type: s.sourceType, url: s.sourceUrl })),
    }));

  return {
    business: {
      gstin: business.gstin,
      legalName: business.legalName,
      tradeName: business.tradeName,
      city: business.city,
      state: business.state,
      pincode: business.pincode,
    },
    contacts: {
      phones,
      emails,
      website: business.website,
    },
  };
}
