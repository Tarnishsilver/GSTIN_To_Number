import { lookupGSTBusiness } from "./modules/gst/gst.service";
import { discoverBusiness } from "./modules/discovery/discovery.service";
import { calculateBusinessMatchScore } from "./modules/scoring/identity-score";
import { scoreContacts } from "./modules/scoring/contact-score";
import { discoverWebsiteContacts } from "./modules/crawler/crawler.service";

const IDENTITY_THRESHOLD = 0.4;

async function main() {
  const gstin = process.argv[2];

  if (!gstin) {
    console.error("Usage: npm run lookup <GSTIN>");
    console.error("Example: npm run lookup 24ABOCS0383E2ZB");
    process.exit(1);
  }

  console.log(`\n🔍 Looking up GSTIN: ${gstin.toUpperCase()}\n`);

  console.log("[1/4] Fetching GST data from ClearTax...");
  const { validation, details } = await lookupGSTBusiness(gstin.trim());

  if (!details) {
    console.error(`❌ ${validation.error || "Business not found"}`);
    process.exit(1);
  }

  console.log(`  ✓ ${details.legalName}`);
  console.log(`  ✓ ${details.tradeName ? details.tradeName + " | " : ""}${details.address.city}, ${details.address.state}`);
  console.log(`  ✓ Status: ${details.registrationStatus} | Type: ${details.businessType}`);

  console.log("\n[2/4] Searching for public contact info...");
  const t0 = Date.now();

  const candidates = await discoverBusiness(
    details.legalName!,
    details.tradeName,
    details.address.city || null,
    details.address.state || null,
    details.address.pincode || null
  );

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ✓ Found ${candidates.length} candidates (${elapsed}s)`);

  const matched = candidates.filter(
    (c) => calculateBusinessMatchScore(details, c) >= IDENTITY_THRESHOLD
  );
  console.log(`  ✓ ${matched.length} matched with score >= ${IDENTITY_THRESHOLD}`);

  console.log("\n[3/4] Scoring and extracting contacts...");
  let contacts = scoreContacts(matched);

  const phones = contacts.filter((c) => c.type === "phone");
  const emails = contacts.filter((c) => c.type === "email");

  const listingSites = ["falconebiz.com", "tracxn.com", "instafinancials.com", "companydetails.in", "indiafilings.com", "registerkaro.in", "rocketreach.co", "signalhire.com", "linkedin.com", "company.incorporated"];
  const ceoEmail = contacts.find(c => c.type === "email" && (c.normalizedValue.includes("ceo") || c.normalizedValue.includes("founder")));
  const bizEmails = contacts.filter(c =>
    c.type === "email" &&
    !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].some(d => c.normalizedValue.endsWith(d)) &&
    !listingSites.some(s => c.normalizedValue.endsWith("@" + s))
  );
  const bizDomain = (ceoEmail || bizEmails[0])?.normalizedValue.split("@")[1];
  const website: string | null = bizDomain ? `https://${bizDomain}` : null;

  console.log("\n[4/4] Building result...");
  console.log("");
  console.log("========================================");
  console.log("  BUSINESS PROFILE");
  console.log("========================================");
  console.log(`  GSTIN:      ${details.gstin}`);
  console.log(`  Legal Name: ${details.legalName}`);
  if (details.tradeName && details.tradeName !== details.legalName) {
    console.log(`  Trade Name: ${details.tradeName}`);
  }
  console.log(`  Address:    ${[
    details.address.building,
    details.address.street,
    details.address.city || details.address.locality,
    details.address.state,
    details.address.pincode,
  ]
    .filter(Boolean)
    .join(", ")}`);
  console.log(
    `  Status:     ${details.registrationStatus} | ${details.businessType}`
  );
  if (details.registrationDate) {
    console.log(`  Registered: ${details.registrationDate}`);
  }

  console.log("");
  console.log("========================================");
  console.log("  PUBLIC CONTACT INFORMATION");
  console.log("========================================");

  if (website) {
    console.log(`  Website: ${website}`);
  } else {
    console.log("  Website: not found");
  }

  console.log("");
  console.log("  Phone Numbers:");
  if (phones.length > 0) {
    const companyPhones = phones.filter(p => p.sourceType !== "search_result" || p.confidence >= 0.8);
    const otherPhones = phones.filter(p => !companyPhones.includes(p));
    
    for (const p of companyPhones) {
      const pct = Math.round(p.confidence * 100);
      const bar = pct >= 90 ? "🟢" : pct >= 70 ? "🟡" : "🔴";
      console.log(
        `    ${bar} ${p.normalizedValue} (${pct}% - ${p.sourceType})`
      );
    }
    if (otherPhones.length > 0) {
      console.log("");
      console.log("  Additional numbers found:");
      for (const p of otherPhones) {
        console.log(`    📱 ${p.normalizedValue} (${Math.round(p.confidence*100)}% - ${p.sourceType})`);
      }
    }
  } else {
    console.log("    No publicly listed business phone number found.");
  }

  console.log("");
  console.log("  Email Addresses:");
  if (emails.length > 0) {
    for (const e of emails) {
      console.log(`    ✉️  ${e.normalizedValue}`);
    }
  } else {
    console.log("    No publicly listed email address found.");
  }

  const ownerEmails = emails.filter(e => e.sourceUrl?.includes("linkedin.com") || e.sourceType === "search_result");
  if (ownerEmails.length > 0 && ownerEmails.length !== emails.length) {
    console.log("\n  Owner/Director Contacts:");
    const ownersWithContacts = matched.filter(c => 
      c.phoneNumbers.length > 0 || c.emails.length > 0
    ).filter(c => {
      const isOwner = ![
        details.legalName?.toLowerCase(),
        details.tradeName?.toLowerCase()
      ].some(n => n && c.name.toLowerCase().includes(n));
      return isOwner;
    });
    for (const o of ownersWithContacts.slice(0, 3)) {
      console.log(`    👤 ${o.name}`);
      if (o.phoneNumbers.length > 0) console.log(`       📞 ${o.phoneNumbers.join(", ")}`);
      if (o.emails.length > 0) console.log(`       📧 ${o.emails.join(", ")}`);
    }
  }

  console.log("");
  console.log("========================================");
  console.log("  SOURCES");
  console.log("========================================");
  const sources = new Map<string, string[]>();
  for (const c of contacts) {
    const key = c.sourceUrl || c.source;
    if (!sources.has(key)) sources.set(key, []);
    sources.get(key)!.push(c.type + ": " + c.normalizedValue);
  }
  for (const [source, items] of sources) {
    console.log(`  ${source}`);
    for (const item of items) {
      console.log(`    - ${item}`);
    }
  }

  if (phones.length === 0 && emails.length === 0) {
    console.log("\n  ℹ️  Business identified, but no publicly available contact");
    console.log("     information was found through automated search.");
  }

  console.log("");

  const rawDump = {
    gstin: details.gstin,
    business: {
      legalName: details.legalName,
      tradeName: details.tradeName,
      city: details.address.city,
      state: details.address.state,
      pincode: details.address.pincode,
      status: details.registrationStatus,
      type: details.businessType,
      registrationDate: details.registrationDate,
    },
    website,
    phones: phones.map(p => ({ number: p.normalizedValue, confidence: p.confidence, source: p.sourceType, sourceUrl: p.sourceUrl })),
    emails: emails.map(e => ({ email: e.normalizedValue, confidence: e.confidence, source: e.sourceType, sourceUrl: e.sourceUrl })),
    sources: matched.map(c => ({
      name: c.name,
      url: c.sourceUrl,
      website: c.website,
      phones: c.phoneNumbers,
      emails: c.emails,
      rawText: (c as any).rawText?.substring(0, 5000) || null,
    })),
  };

  const dumpFile = `/tmp/gstin_data_${details.gstin}.json`;
  require("fs").writeFileSync(dumpFile, JSON.stringify(rawDump, null, 2));
  console.log(`  📁 Raw data saved to: ${dumpFile}`);
  console.log("  🤖 Feed this file to any AI tool for deeper analysis.");
  console.log("");
}

main().catch((e) => {
  console.error("\n❌ Error:", e.message || e);
  process.exit(1);
});
