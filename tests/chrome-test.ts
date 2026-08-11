import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

async function test() {
  console.log("Launching Chrome...");
  const ctx = await chromium.launchPersistentContext(
    "/mnt/c/Users/Archana/AppData/Local/Google/Chrome/User Data",
    {
      headless: false,
      executablePath: "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      viewport: { width: 1366, height: 768 },
    }
  );
  console.log("Chrome launched! Opening google.com...");
  const page = await ctx.newPage();
  await page.goto("https://www.google.com", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("Page title:", await page.title());
  console.log("Searching...");
  await page.goto("https://www.google.co.in/search?q=test", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("Search title:", await page.title());
  await ctx.close();
  console.log("Done!");
}

test().catch((e) => console.error("FAILED:", e.message));
