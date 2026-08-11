import { GSTProvider } from "../gst.types";
import { MockGSTProvider } from "./mock.provider";
import { ClearTaxGSTProvider } from "./cleartax.provider";
import { env } from "../../../config/env";

export function createGSTProvider(): GSTProvider {
  switch (env.GST_PROVIDER) {
    case "mock":
      return new MockGSTProvider();
    case "cleartax":
      return new ClearTaxGSTProvider();
    case "official":
      throw new Error("Official GST provider not yet implemented");
    case "authorized_api":
      throw new Error("Authorized API GST provider not yet implemented");
    default:
      throw new Error(`Unknown GST provider: ${env.GST_PROVIDER}`);
  }
}
