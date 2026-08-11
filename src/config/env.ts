import { z } from "zod";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  GST_PROVIDER: z.enum(["mock", "cleartax", "official", "authorized_api"]).default("mock"),
  GST_API_URL: z.string().optional(),
  GST_CLIENT_ID: z.string().optional(),
  GST_CLIENT_SECRET: z.string().optional(),
  CLEARTAX_BASE_URL: z.string().default("https://cleartax.in"),
  SEARCH_PROVIDER: z.enum(["mock", "google-dork", "google", "serpapi"]).default("mock"),
  SEARCH_API_KEY: z.string().optional(),
  RATE_LIMIT_WINDOW: z.coerce.number().default(3600),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOOKUP_CACHE_TTL: z.coerce.number().default(86400),
  BUSINESS_SEARCH_CACHE_TTL: z.coerce.number().default(604800),
  DORK_DELAY_MIN_MS: z.coerce.number().default(2000),
  DORK_DELAY_MAX_MS: z.coerce.number().default(5000),
  BROWSER_TIMEOUT_MS: z.coerce.number().default(30000),
  DORK_HEADFUL: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const raw = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    GST_PROVIDER: process.env.GST_PROVIDER,
    GST_API_URL: process.env.GST_API_URL,
    GST_CLIENT_ID: process.env.GST_CLIENT_ID,
    GST_CLIENT_SECRET: process.env.GST_CLIENT_SECRET,
    CLEARTAX_BASE_URL: process.env.CLEARTAX_BASE_URL,
    SEARCH_PROVIDER: process.env.SEARCH_PROVIDER,
    SEARCH_API_KEY: process.env.SEARCH_API_KEY,
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    LOOKUP_CACHE_TTL: process.env.LOOKUP_CACHE_TTL,
    BUSINESS_SEARCH_CACHE_TTL: process.env.BUSINESS_SEARCH_CACHE_TTL,
    DORK_DELAY_MIN_MS: process.env.DORK_DELAY_MIN_MS,
    DORK_DELAY_MAX_MS: process.env.DORK_DELAY_MAX_MS,
    BROWSER_TIMEOUT_MS: process.env.BROWSER_TIMEOUT_MS,
    DORK_HEADFUL: process.env.DORK_HEADFUL,
  };

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
