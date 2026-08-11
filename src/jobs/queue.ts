import IORedis from "ioredis";
import { Queue, Worker, Job } from "bullmq";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const lookupQueue = new Queue("gstin-lookup", { connection });

export function createWorker(): Worker {
  const worker = new Worker(
    "gstin-lookup",
    async (job: Job) => {
      const { processLookup } = await import("../modules/lookup/lookup.worker");
      return processLookup(job);
    },
    {
      connection,
      concurrency: 5,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, lookupId: job.data.lookupId }, "Lookup job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Lookup job failed");
  });

  return worker;
}

export async function closeQueue(): Promise<void> {
  await lookupQueue.close();
  await connection.quit();
}
