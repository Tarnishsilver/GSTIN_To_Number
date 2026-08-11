import { BusinessDiscoveryProvider, BusinessCandidate, BusinessSearchQuery } from "./discovery.types";
import { createDiscoveryProvider } from "./providers/provider";
import { logger } from "../../utils/logger";
import { withRetry } from "../../utils/retry";

let discoveryProvider: BusinessDiscoveryProvider | null = null;

function getProvider(): BusinessDiscoveryProvider {
  if (!discoveryProvider) {
    discoveryProvider = createDiscoveryProvider();
  }
  return discoveryProvider;
}

function buildQueries(
  legalName: string,
  tradeName: string | null,
  city: string | null,
  state: string | null,
  pincode: string | null
): BusinessSearchQuery[] {
  const queries: BusinessSearchQuery[] = [];

  const primary: BusinessSearchQuery = {
    companyName: legalName,
    tradeName: tradeName || undefined,
    city: city || undefined,
    state: state || undefined,
    pincode: pincode || undefined,
  };
  queries.push(primary);

  if (tradeName && tradeName !== legalName) {
    queries.push({
      companyName: tradeName,
      city: city || undefined,
      state: state || undefined,
      pincode: pincode || undefined,
    });
  }

  return queries;
}

export async function discoverBusiness(
  legalName: string,
  tradeName: string | null,
  city: string | null,
  state: string | null,
  pincode: string | null
): Promise<BusinessCandidate[]> {
  const provider = getProvider();
  const queries = buildQueries(legalName, tradeName, city, state, pincode);
  const allResults: BusinessCandidate[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const results = await withRetry(
        () => provider.search(query),
        { maxAttempts: 2, baseDelayMs: 2000 }
      );

      for (const candidate of results) {
        const key = `${candidate.name}|${candidate.city}|${candidate.source}`;
        if (!seen.has(key)) {
          seen.add(key);
          allResults.push(candidate);
        }
      }
    } catch (error: any) {
      logger.warn(
        { query, err: error },
        "Discovery search query failed, continuing with next query"
      );
    }
  }

  return allResults;
}
