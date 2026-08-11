import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createLookup, getLookup, getBusinessByGSTIN } from "./lookup.service";
import { logger } from "../../utils/logger";

export const lookupController = Router();

const lookupSchema = z.object({
  gstin: z.string().min(1).max(20).transform((v) => v.trim()),
});

lookupController.post(
  "/lookup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = lookupSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.issues,
          },
        });
        return;
      }

      const { gstin } = parsed.data;

      logger.info({ requestId: req.requestId, gstin }, "Lookup requested");

      const result = await createLookup(gstin);

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

lookupController.get(
  "/lookup/:lookupId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lookupId = req.params.lookupId as string;

      if (!lookupId || lookupId.length < 10) {
        res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid lookup ID" },
        });
        return;
      }

      const result = await getLookup(lookupId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

lookupController.get(
  "/business/:gstin",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gstin = req.params.gstin as string;

      const result = await getBusinessByGSTIN(gstin);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
