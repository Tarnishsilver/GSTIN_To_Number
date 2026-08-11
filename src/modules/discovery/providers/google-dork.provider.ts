import { chromium } from "playwright-extra";
import type { Browser, BrowserContext, Page } from "playwright";
import { BusinessDiscoveryProvider, BusinessCandidate, BusinessSearchQuery } from "../discovery.types";
import { buildDorkQueries } from "../dork-builder";
import { normalizeIndianPhoneNumber } from "../../contacts/phone-normalizer";
import { extractEmails } from "../../contacts/email-extractor";
import { env } from "../../../config/env";
import { logger } from "../../../utils/logger";

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
chromium.use(StealthPlugin());

interface CrawlData {
  phones: string[];
  emails: string[];
  website: string;
  ownerNames: string[];
  rawText: string;
}

const BLOCKED_SITES = ["rocketreach.co", "signalhire.com", "linkedin.com"];

interface SERPResult {
  url: string;
  title: string;
  snippet: string;
  position: number;
}

export class GoogleDorkDiscoveryProvider implements BusinessDiscoveryProvider {

  async search(query: BusinessSearchQuery): Promise<BusinessCandidate[]> {
    const dorkQueries = buildDorkQueries(
      query.companyName, query.tradeName || null,
      query.city || null, query.state || null, query.pincode || null
    );

    logger.info({ company: query.companyName, queryCount: dorkQueries.length }, "Starting discovery");

    const allCandidates: BusinessCandidate[] = [];
    const allResults: SERPResult[] = [];
    const visitedDomains = new Set<string>();

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      browser = await this.launchBrowser();
      context = await browser.newContext({
        userAgent: this.randomUserAgent(),
        viewport: { width: 1366, height: 768 },
        locale: "en-IN",
        timezoneId: "Asia/Kolkata",
      });
      const page = await context.newPage();

      for (let i = 0; i < Math.min(dorkQueries.length, 8); i++) {
        const dork = dorkQueries[i]!;

        try {
          const results = await this.searchDDG(page, dork.query);
          allResults.push(...results);

          logger.debug({ q: dork.query.substring(0, 60), n: results.length }, "DDG result");

          if (results.length > 0 && i >= 3) break;
        } catch (err: any) {
          logger.warn({ query: dork.query.substring(0, 60) }, "Search failed");
        }

        await this.humanDelay(3000, 9000);
      }

      const uniqueResults = this.deduplicateResults(allResults);

      for (const result of uniqueResults.slice(0, 10)) {
        const domain = this.extractDomain(result.url);
        if (!domain || visitedDomains.has(domain) || BLOCKED_SITES.some(s => domain.includes(s))) continue;
        visitedDomains.add(domain);

        const contactData = await this.deepCrawl(page, result.url, domain);
        allCandidates.push(this.buildCandidate(query, result, contactData));

        await this.humanDelay(1000, 4000);
      }

      await context.close();
    } catch (error: any) {
      logger.error({ err: error }, "Browser error");
    } finally {
      try { if (context) await context.close(); } catch {}
      try { if (browser) await browser.close(); } catch {}
    }

    logger.info({ company: query.companyName, candidates: allCandidates.length }, "Discovery complete");
    return allCandidates;
  }

  private async launchBrowser(): Promise<Browser> {
    return chromium.launch({
      headless: !env.DORK_HEADFUL,
      args: [
        "--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu",
        "--disable-dev-shm-usage", "--no-first-run", "--no-zygote",
        "--headless=new",
      ],
    });
  }

  private async searchDDG(page: Page, query: string): Promise<SERPResult[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://lite.duckduckgo.com/lite/?q=${encoded}&kl=in-en`;

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await this.humanDelay(2000, 4000);

      await this.simulateHuman(page);
      await this.humanDelay(500, 1500);

      const rawText = await page.evaluate(() => (document.body as HTMLElement).innerText);
      return this.parseDDGResults(rawText);
    } catch {
      return [];
    }
  }

  private async simulateHuman(page: Page): Promise<void> {
    try {
      const h = await page.evaluate(() => document.body.scrollHeight);
      const steps = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < steps; i++) {
        const pos = (h / steps) * (i + 1) * (0.3 + Math.random() * 0.7);
        await page.evaluate((p) => window.scrollTo({ top: p, behavior: "smooth" }), pos);
        await this.sleep(300 + Math.random() * 800);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    } catch {}
  }

  private parseDDGResults(text: string): SERPResult[] {
    const results: SERPResult[] = [];
    const lines = text.split("\n");
    let current: { title: string; snippet: string; url: string } | null = null;

    for (const l of lines) {
      const line = l.trim();
      if (!line || line === " ") continue;

      const match = line.match(/^(\d+)\.\s+(.+)$/);
      if (match) {
        if (current) {
          results.push({ url: current.url || "", title: current.title, snippet: current.snippet.trim(), position: results.length + 1 });
        }
        current = { title: match[2]!, snippet: "", url: "" };
        continue;
      }

      if (!current) continue;

      const urlMatch = line.match(/\b([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(\/[^\s]{0,200})?/g);
      if (urlMatch && !current.url) {
        const u = urlMatch[0]!;
        current.url = u.startsWith("http") ? u : `https://${u}`;
        continue;
      }

      if (line.length > 5 && !line.match(/^\d+\./)) {
        current.snippet += " " + line;
      }
    }

    if (current) {
      results.push({ url: current.url || "", title: current.title, snippet: current.snippet.trim(), position: results.length + 1 });
    }

    return results.filter(r => r.url && r.title).slice(0, 12);
  }

  private async deepCrawl(page: Page, resultUrl: string, domain: string): Promise<CrawlData> {
    const phones: string[] = [];
    const emails: string[] = [];
    const ownerNames: string[] = [];
    let fullRawText = "";

    const crawlPath = resultUrl.startsWith("http") ? resultUrl : `https://${domain}${resultUrl}`;

    // Crawl main page
    try {
      await page.goto(crawlPath, { waitUntil: "domcontentloaded", timeout: 15000 });
      await this.humanDelay(1000, 3000);
      await this.simulateHuman(page);

      const data = await page.evaluate(() => ({
        text: (document.body as HTMLElement).innerText || "",
        links: Array.from(document.querySelectorAll("a[href]")).map(a => a.getAttribute("href") || ""),
        title: document.title || "",
      }));

      fullRawText = `TITLE: ${data.title}\nURL: ${crawlPath}\n${data.text}`;

      this.extractAll(data.text, data.links, phones, emails);
      this.extractNames(data.text, ownerNames);
    } catch {}

    // Crawl contact pages on company's own site (not listing sites)
    const isListingSite = /zaubacorp|instafinancials|thecompanycheck|tofler\.in|companydetails|indiafilings|falconebiz|tracxn|registerkaro/i.test(domain);
    if (!isListingSite) {
      const subPaths = ["/contact", "/about", "/about-us", "/contact-us"];
      for (const path of subPaths) {
        try {
          await page.goto(`https://${domain}${path}`, { waitUntil: "domcontentloaded", timeout: 10000 });
          await this.sleep(500 + Math.random() * 1000);

          const subData = await page.evaluate(() => ({
            text: (document.body as HTMLElement).innerText || "",
            links: Array.from(document.querySelectorAll("a[href]")).map(a => a.getAttribute("href") || ""),
          }));

          fullRawText += `\n--- ${path} ---\n${subData.text}`;
          this.extractAll(subData.text, subData.links, phones, emails);

          if (phones.length > 0) break;
        } catch { continue; }
      }
    }

    return { phones, emails, website: `https://${domain}`, ownerNames, rawText: fullRawText };
  }

  private extractAll(text: string, links: string[], phones: string[], emails: string[]): void {
    const labelPatterns = [
      /(?:Phone|Mobile|Contact No|Phone No|Telephone|Tel|Call|WhatsApp|Whats App)[.:\s-]+(\+?[\d][\d\s()-]{7,16})/gi,
      /(?:Email|E-mail|Mail|E Mail)[.:\s-]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    ];

    for (const pattern of labelPatterns) {
      let m;
      while ((m = pattern.exec(text)) !== null) {
        const val = m[1]!.trim();
        if (val.includes("@")) {
          const e = val.toLowerCase();
          if (!emails.includes(e) && e.length > 5) emails.push(e);
        } else {
          const norm = normalizeIndianPhoneNumber(val);
          if (norm && !phones.includes(norm.e164)) phones.push(norm.e164);
        }
      }
    }

    const rawPhones = text.match(/\b[6789]\d{4}[\s-]?\d{5}\b/g) || [];
    for (const num of rawPhones) {
      const norm = normalizeIndianPhoneNumber(num);
      if (norm && !phones.includes(norm.e164)) phones.push(norm.e164);
    }

    const allPhones = this.extractPhonesFromText(text);
    for (const phone of allPhones) {
      if (!phones.includes(phone)) phones.push(phone);
    }

    const foundEmails = extractEmails(text);
    for (const e of foundEmails) {
      if (e.normalized && e.normalized.length > 5 && e.normalized.includes("@") && !emails.includes(e.normalized)) {
        emails.push(e.normalized);
      }
    }

    for (const link of links) {
      if (link.startsWith("tel:")) {
        const norm = normalizeIndianPhoneNumber(link.replace("tel:", "").trim());
        if (norm && !phones.includes(norm.e164)) phones.push(norm.e164);
      }
      if (link.includes("wa.me/")) {
        const m = link.match(/wa\.me\/(\d+)/);
        if (m) {
          const norm = normalizeIndianPhoneNumber(`+91${m[1]}`);
          if (norm && !phones.includes(norm.e164)) phones.push(norm.e164);
        }
      }
      const mailto = link.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (mailto) {
        const e = mailto[1]!.toLowerCase();
        if (!emails.includes(e)) emails.push(e);
      }
    }
  }

  private extractNames(text: string, names: string[]): void {
    const section = text.match(/(?:Director|Proprietor|Promoter|Signatory|Partner|CEO|Founder)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi);
    if (section) {
      const found = section[0]!.replace(/(?:Director|Proprietor|Promoter|Signatory|Partner|CEO|Founder)\s*:?\s*/i, "").trim();
      if (found.length > 5 && found.length < 50 && /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(found)) {
        if (!names.includes(found)) names.push(found);
      }
    }
  }

  private buildCandidate(query: BusinessSearchQuery, serp: SERPResult, contact: CrawlData): BusinessCandidate {
    const combinedPhones = [...contact.phones];
    const combinedEmails = [...contact.emails];

    const snippetPhones = this.extractPhonesFromText(serp.snippet);
    for (const p of snippetPhones) { if (!combinedPhones.includes(p)) combinedPhones.push(p); }
    const snippetEmails = extractEmails(serp.snippet);
    for (const e of snippetEmails) { if (!combinedEmails.includes(e.normalized)) combinedEmails.push(e.normalized); }

    return {
      name: serp.title || query.companyName,
      website: contact.website,
      phoneNumbers: combinedPhones,
      emails: combinedEmails,
      city: query.city, state: query.state, pincode: query.pincode,
      source: "google-dork", sourceUrl: serp.url,
      rawText: contact.rawText,
    };
  }

  private extractPhonesFromText(text: string): string[] {
    const patterns = [/(?:\+91[-\s]?)?[6789]\d{4}[-\s]?\d{5}/g, /\b[6789]\d{9}\b/g, /\+\d{2}[-\s]?\d{4,5}[-\s]?\d{4,5}/g];
    const found = new Set<string>();
    for (const pattern of patterns) {
      for (const m of text.match(pattern) || []) {
        const norm = normalizeIndianPhoneNumber(m);
        if (norm && !found.has(norm.e164)) found.add(norm.e164);
      }
    }
    return Array.from(found);
  }

  private extractDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
  }

  private deduplicateResults(results: SERPResult[]): SERPResult[] {
    const seen = new Map<string, SERPResult>();
    for (const r of results) {
      const d = this.extractDomain(r.url);
      if (!d) continue;
      if (!seen.has(d) || r.position < seen.get(d)!.position) seen.set(d, r);
    }
    return Array.from(seen.values()).sort((a, b) => a.position - b.position);
  }

  private humanDelay(min: number, max: number): Promise<void> {
    return this.sleep(min + Math.random() * (max - min));
  }

  private randomUserAgent(): string {
    const agents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];
    return agents[Math.floor(Math.random() * agents.length)]!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
