import express from "express";
import helmet from "helmet";
import cors from "cors";
import { requestIdMiddleware } from "./middleware/request-id";
import { rateLimit } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error-handler";
import { lookupController } from "./modules/lookup/lookup.controller";
import { env } from "./config/env";

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.NODE_ENV === "production" ? process.env.CORS_ORIGIN : "*",
      methods: ["GET", "POST"],
      maxAge: 86400,
    })
  );
  app.use(express.json({ limit: "1kb" }));
  app.use(requestIdMiddleware);
  app.use(rateLimit);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/v1", lookupController);

  app.use(express.static("public"));

  app.use(errorHandler);

  return app;
}
