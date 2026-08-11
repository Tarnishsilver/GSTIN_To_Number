interface DorkQuery {
  query: string;
  purpose: "contact" | "owner" | "discovery" | "listing" | "domain" | "deep";
  priority: number;
  notes: string;
}

export function buildDorkQueries(
  legalName: string,
  tradeName: string | null,
  city: string | null,
  _state: string | null,
  pincode: string | null
): DorkQuery[] {
  const queries: DorkQuery[] = [];
  const nameExact = `"${legalName}"`;
  const nameWords = extractKeywords(legalName);

  // ===== PRIORITY 1: Direct contact searches =====
  queries.push({
    query: `${nameExact} contact`,
    purpose: "contact",
    priority: 1,
    notes: "Contact page",
  });
  queries.push({
    query: `${nameExact} phone email`,
    purpose: "contact",
    priority: 1,
    notes: "Phone and email",
  });
  if (city) {
    queries.push({
      query: `${nameExact} "${city}" phone`,
      purpose: "contact",
      priority: 2,
      notes: "Location phone",
    });
  }

  // ===== PRIORITY 2: Owner/director searches =====
  queries.push({
    query: `${nameExact} director name contact`,
    purpose: "owner",
    priority: 3,
    notes: "Director contact",
  });
  queries.push({
    query: `${nameExact} founder CEO contact`,
    purpose: "owner",
    priority: 3,
    notes: "Executive contact",
  });

  // ===== PRIORITY 3: Website discovery =====
  queries.push({
    query: `${nameWords} contact`,
    purpose: "discovery",
    priority: 5,
    notes: "Keyword search for website",
  });
  queries.push({
    query: `${nameExact} site:scaninfoga.com`,
    purpose: "discovery",
    priority: 5,
    notes: "Domain search",
  });

  // ===== PRIORITY 4: Listing sites for director/contact info =====
  queries.push({
    query: `${nameExact} site:zaubacorp.com`,
    purpose: "listing",
    priority: 10,
    notes: "ZaubaCorp",
  });
  queries.push({
    query: `${nameExact} site:instafinancials.com`,
    purpose: "listing",
    priority: 10,
    notes: "Instafinancials",
  });
  queries.push({
    query: `${nameExact} site:companydetails.in`,
    purpose: "listing",
    priority: 10,
    notes: "CompanyDetails",
  });
  queries.push({
    query: `${nameExact} site:indiafilings.com`,
    purpose: "listing",
    priority: 10,
    notes: "IndiaFilings",
  });
  queries.push({
    query: `${nameExact} site:falconebiz.com`,
    purpose: "listing",
    priority: 10,
    notes: "Falconebiz",
  });

  // ===== PRIORITY 5: More listing/contact =====
  queries.push({
    query: `${nameExact} site:linkedin.com`,
    purpose: "listing",
    priority: 15,
    notes: "LinkedIn",
  });
  queries.push({
    query: `${nameExact} site:tracxn.com`,
    purpose: "listing",
    priority: 15,
    notes: "Tracxn",
  });
  queries.push({
    query: `${nameExact} site:tofler.in`,
    purpose: "listing",
    priority: 15,
    notes: "Tofler",
  });

  return deduplicateQueries(queries);
}

function extractKeywords(name: string): string {
  return name
    .replace(
      /\b(Pvt|Private|Ltd|Limited|Company|Corporation|LLP|OPC|Inc|Incorporated)\b\.?/gi,
      ""
    )
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function deduplicateQueries(queries: DorkQuery[]): DorkQuery[] {
  const seen = new Set<string>();
  const result: DorkQuery[] = [];
  for (const q of queries) {
    const key = q.query.toLowerCase().trim();
    if (!seen.has(key)) { seen.add(key); result.push(q); }
  }
  return result;
}
