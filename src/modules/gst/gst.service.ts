import { GSTProvider, GSTBusinessDetails, GSTINValidationResult } from "./gst.types";
import { validateGSTIN } from "./gst.validator";
import { createGSTProvider } from "./providers/gst.provider";
import { logger } from "../../utils/logger";
import { withRetry } from "../../utils/retry";

let gstProvider: GSTProvider | null = null;

function getProvider(): GSTProvider {
  if (!gstProvider) {
    gstProvider = createGSTProvider();
  }
  return gstProvider;
}

export async function lookupGSTBusiness(gstin: string): Promise<{
  validation: GSTINValidationResult;
  details: GSTBusinessDetails | null;
}> {
  const validation = validateGSTIN(gstin);

  if (!validation.valid || !validation.normalizedGSTIN) {
    return { validation, details: null };
  }

  const provider = getProvider();

  try {
    const details = await withRetry(
      () => provider.getBusinessDetails(validation.normalizedGSTIN!),
      { maxAttempts: 3, baseDelayMs: 2000 }
    );

    return { validation, details };
  } catch (error: any) {
    logger.error(
      { gstin: validation.normalizedGSTIN, err: error },
      "GST provider lookup failed"
    );
    throw error;
  }
}
