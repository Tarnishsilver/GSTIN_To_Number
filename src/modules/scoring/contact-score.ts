import { BusinessCandidate } from "../discovery/discovery.types";

export interface ContactWithScore {
  type: "phone" | "email" | "website";
  value: string;
  normalizedValue: string;
  confidence: number;
  source: string;
  sourceUrl?: string;
  sourceType: ContactSourceType;
}

export type ContactSourceType =
  | "official_website"
  | "official_contact_page"
  | "business_listing"
  | "public_directory"
  | "company_profile"
  | "search_result";

const SOURCE_CONFIDENCE: Record<ContactSourceType, number> = {
  official_website: 0.9,
  official_contact_page: 0.95,
  business_listing: 0.8,
  public_directory: 0.7,
  company_profile: 0.75,
  search_result: 0.5,
};

export function getBaseConfidence(sourceType: ContactSourceType): number {
  return SOURCE_CONFIDENCE[sourceType] || 0.5;
}

export function boostConfidenceForConsensus(
  contacts: ContactWithScore[]
): ContactWithScore[] {
  const groups = new Map<string, ContactWithScore[]>();

  for (const c of contacts) {
    const key = `${c.type}|${c.normalizedValue}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(c);
  }

  const scored: ContactWithScore[] = [];

  for (const [, group] of groups) {
    if (group.length === 1) {
      scored.push(group[0]!);
    } else {
      const bestSource = group.reduce((a, b) =>
        getBaseConfidence(a.sourceType) > getBaseConfidence(b.sourceType) ? a : b
      );

      const bonus = Math.min((group.length - 1) * 0.05, 0.15);
      bestSource.confidence = Math.min(bestSource.confidence + bonus, 0.99);

      const merged = { ...bestSource };

      for (const other of group) {
        if (other !== bestSource && other.sourceUrl) {
          merged.sourceType = bestSource.sourceType;
        }
      }

      scored.push(merged);
    }
  }

  return scored;
}

export function scoreContacts(
  candidates: BusinessCandidate[],
  identityThreshold: number = 0.7
): ContactWithScore[] {
  const contacts: ContactWithScore[] = [];

  for (const candidate of candidates) {
    if (!candidate.website) continue;

    const sourceType: ContactSourceType = candidate.website
      ? "official_website"
      : "search_result";

    for (const phone of candidate.phoneNumbers) {
      contacts.push({
        type: "phone",
        value: phone,
        normalizedValue: phone,
        confidence: getBaseConfidence(sourceType),
        source: candidate.source,
        sourceUrl: candidate.sourceUrl || candidate.website,
        sourceType,
      });
    }

    for (const email of candidate.emails) {
      contacts.push({
        type: "email",
        value: email,
        normalizedValue: email.toLowerCase(),
        confidence: getBaseConfidence(sourceType),
        source: candidate.source,
        sourceUrl: candidate.sourceUrl || candidate.website,
        sourceType,
      });
    }

    if (candidate.website) {
      contacts.push({
        type: "website",
        value: candidate.website,
        normalizedValue: candidate.website.toLowerCase(),
        confidence: 0.99,
        source: candidate.source,
        sourceUrl: candidate.website,
        sourceType: "official_website",
      });
    }
  }

  return boostConfidenceForConsensus(contacts);
}
