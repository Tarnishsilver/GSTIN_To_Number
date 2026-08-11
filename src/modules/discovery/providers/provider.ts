import { BusinessDiscoveryProvider } from "../discovery.types";
import { MockDiscoveryProvider } from "./mock.provider";
import { GoogleDorkDiscoveryProvider } from "./google-dork.provider";
import { env } from "../../../config/env";

export function createDiscoveryProvider(): BusinessDiscoveryProvider {
  switch (env.SEARCH_PROVIDER) {
    case "mock":
      return new MockDiscoveryProvider();
    case "google-dork":
      return new GoogleDorkDiscoveryProvider();
    case "google":
      throw new Error("Google search provider not yet implemented");
    case "serpapi":
      throw new Error("SerpAPI provider not yet implemented");
    default:
      throw new Error(`Unknown search provider: ${env.SEARCH_PROVIDER}`);
  }
}
