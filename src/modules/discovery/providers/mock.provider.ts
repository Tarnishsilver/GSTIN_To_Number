import { BusinessDiscoveryProvider, BusinessCandidate, BusinessSearchQuery } from "../discovery.types";

const MOCK_RESULTS: Record<string, BusinessCandidate[]> = {
  "abc-technologies-mumbai": [
    {
      name: "ABC Technologies Pvt Ltd",
      website: "https://www.abctechnologies.com",
      phoneNumbers: ["+91-22-6123-4567", "+919876543210"],
      emails: ["info@abctechnologies.com", "sales@abctechnologies.com"],
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400093",
      source: "mock",
      sourceUrl: "https://www.abctechnologies.com",
    },
  ],
  "gujarat-industrial-ahmedabad": [
    {
      name: "Gujarat Industrial Solutions Ltd",
      website: "https://www.gisindustries.in",
      phoneNumbers: ["+91-79-4567-8901"],
      emails: ["info@gisindustries.in"],
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "382445",
      source: "mock",
      sourceUrl: "https://www.gisindustries.in",
    },
  ],
  "bangalore-software-bangalore": [
    {
      name: "Bangalore Software Innovations Pvt Ltd",
      website: "https://www.bsisoft.io",
      phoneNumbers: ["+91-80-1234-5678", "+918001234567"],
      emails: ["contact@bsisoft.io", "support@bsisoft.io"],
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560037",
      source: "mock",
      sourceUrl: "https://www.bsisoft.io",
    },
  ],
  "delhi-trading-delhi": [
    {
      name: "Delhi Trading Co",
      phoneNumbers: ["+911123456789"],
      emails: [],
      city: "Delhi",
      state: "Delhi",
      pincode: "110006",
      source: "mock",
      sourceUrl: undefined,
    },
  ],
};

function buildKey(query: BusinessSearchQuery): string {
  const nameSlug = (query.companyName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
  const citySlug = (query.city || "").toLowerCase().replace(/[^a-z]+/g, "-");

  return `${nameSlug}-${citySlug}`;
}

export class MockDiscoveryProvider implements BusinessDiscoveryProvider {
  async search(query: BusinessSearchQuery): Promise<BusinessCandidate[]> {
    const key = buildKey(query);

    if (MOCK_RESULTS[key]) {
      return MOCK_RESULTS[key]!;
    }

    const partialMatches = Object.entries(MOCK_RESULTS)
      .filter(([k]) => k.startsWith(key.substring(0, 15)))
      .flatMap(([, v]) => v);

    if (partialMatches.length > 0) {
      return partialMatches;
    }

    return [];
  }
}
