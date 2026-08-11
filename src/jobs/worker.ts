import { createWorker } from "./queue";
import { logger } from "../utils/logger";

function main(): void {
  logger.info("Starting lookup worker");
  createWorker();
  logger.info("Worker started, waiting for jobs");
}

main();
