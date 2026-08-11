import { GSTBusinessDetails } from "../gst/gst.types";
import { BusinessCandidate } from "../discovery/discovery.types";

interface MatchSignals {
  nameMatch: number;
  tradeNameMatch: number;
  cityMatch: number;
  stateMatch: number;
  pincodeMatch: number;
  addressMatch: number;
  websiteMatch: number;
}

const THRESHOLD = 0.7;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b(?:pvt|private)\s*(?:ltd|limited)?\b/g, "")
    .replace(/\b(?:ltd|limited)\b/g, "")
    .replace(/\b(?:co|company|corporation|corp)\b/g, "")
    .replace(/\b(?:llp|opc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyNameScore(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const aWords = na.split(" ").filter(Boolean);
  const bWords = nb.split(" ").filter(Boolean);

  if (aWords.length === 0 || bWords.length === 0) return 0;

  let matches = 0;
  for (const aw of aWords) {
    if (aw.length < 3) continue;
    for (const bw of bWords) {
      if (bw.length < 3) continue;
      if (aw === bw || aw.includes(bw) || bw.includes(aw)) {
        matches++;
        break;
      }
    }
  }

  const uniqueWords = [...new Set([...aWords, ...bWords])].filter(
    (w) => w.length >= 3
  );

  return uniqueWords.length > 0
    ? matches / Math.max(aWords.length, bWords.length)
    : 0;
}

export function calculateBusinessMatchScore(
  gstBusiness: GSTBusinessDetails,
  candidate: BusinessCandidate
): number {
  let score = 0;
  const signals: MatchSignals = {
    nameMatch: 0,
    tradeNameMatch: 0,
    cityMatch: 0,
    stateMatch: 0,
    pincodeMatch: 0,
    addressMatch: 0,
    websiteMatch: 0,
  };

  const nameScore = fuzzyNameScore(
    gstBusiness.legalName || "",
    candidate.name
  );
  signals.nameMatch = nameScore;
  score += nameScore * 40;

  if (
    gstBusiness.tradeName &&
    candidate.name &&
    fuzzyNameScore(gstBusiness.tradeName, candidate.name) > 0.5
  ) {
    signals.tradeNameMatch = 1;
    score += 30;
  }

  if (
    gstBusiness.address.city?.toLowerCase() === candidate.city?.toLowerCase()
  ) {
    signals.cityMatch = 1;
    score += 10;
  }

  if (
    gstBusiness.address.state?.toLowerCase() ===
    candidate.state?.toLowerCase()
  ) {
    signals.stateMatch = 1;
    score += 5;
  }

  if (gstBusiness.address.pincode === candidate.pincode) {
    signals.pincodeMatch = 1;
    score += 20;
  }

  if (candidate.website && gstBusiness.legalName) {
    const domain = candidate.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0] || "";

    const nameSlug = (gstBusiness.legalName || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

    if (domain.includes(nameSlug.substring(0, 8))) {
      signals.websiteMatch = 1;
      score += 20;
    }
  }

  const maxScore = 125;
  const normalizedScore = Math.min(score / maxScore, 1);

  return Math.round(normalizedScore * 100) / 100;
}

export function isCandidateMatch(
  gstBusiness: GSTBusinessDetails,
  candidate: BusinessCandidate,
  threshold: number = THRESHOLD
): boolean {
  const score = calculateBusinessMatchScore(gstBusiness, candidate);
  return score >= threshold;
}
