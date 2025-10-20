// Add this as the very first import line in config/env.ts
import 'dotenv/config';

/*
 * Kori — Config & Secrets Loader
 * File: config/env.ts
 * Purpose: Centralized, typed environment configuration with schema validation and safe masking for logs.
 * Inputs: process.env (optionally hydrated via .env files at app entrypoints)
 * Outputs: export { env } (typed), loadEnv(), printEnvMasked()
 * Windows Path Context: Repo root is E:\Applications\Kori_web
 * Dependencies: zod; (optional at entrypoint) dotenv/config
 *
 * TODOs (Step 2 scope):
 * - Integrate with apps/api bootstrap to import { env }.
 * - Add .env.example and env-reference.md (next steps in this component).
 * - Wire CI fail-fast on invalid/missing required variables.
 */

import { z } from "zod";

// ---- Masking helper --------------------------------------------------------
function mask(value: string, visibleTail = 4): string {
  if (!value) return "";
  if (value.length <= visibleTail) return "*".repeat(value.length);
  return "*".repeat(Math.max(0, value.length - visibleTail)) + value.slice(-visibleTail);
}

// ---- Schema ----------------------------------------------------------------
// Alignment with /ENV.md at project root; extend as modules grow.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (e.g., file:../data/db.sqlite)"),

  // Cloudflare R2 (optional in early local dev, required for delivery module later)
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),

  // Auth & Secrets
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),
  ML_JWT_SECRET: z.string().min(10, "ML_JWT_SECRET must be at least 10 characters"),
  ADMIN_JWT_SECRET: z.string().min(10, "ADMIN_JWT_SECRET must be at least 10 characters"),

  // CORS / Web
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export type KoriEnv = z.infer<typeof envSchema>;

// ---- Loader ----------------------------------------------------------------
export function loadEnv(raw: NodeJS.ProcessEnv = process.env): KoriEnv {
  // Parse and validate; throws ZodError on failure (fail fast).
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    // Pretty-print errors and exit (do not leak secret values).
    const issues = parsed.error.issues.map(i => `• ${i.path.join(".")}: ${i.message}`).join("\n");
    const msg = `Environment validation failed:\n${issues}`;
    // In library form we throw; callers can decide to process.exit(1)
    throw new Error(msg);
  }
  return parsed.data;
}

// Export a singleton env for convenience in app code.
export const env: KoriEnv = loadEnv();

// ---- Utilities --------------------------------------------------------------
export function printEnvMasked(e: KoriEnv = env): void {
  const masked = {
    NODE_ENV: e.NODE_ENV,
    PORT: e.PORT,
    DATABASE_URL: e.DATABASE_URL,
    R2_ENDPOINT: e.R2_ENDPOINT,
    R2_ACCESS_KEY_ID: e.R2_ACCESS_KEY_ID ? mask(e.R2_ACCESS_KEY_ID) : undefined,
    R2_SECRET_ACCESS_KEY: e.R2_SECRET_ACCESS_KEY ? mask(e.R2_SECRET_ACCESS_KEY) : undefined,
    R2_BUCKET: e.R2_BUCKET,
    CORS_ORIGIN: e.CORS_ORIGIN,
    ADMIN_PASSWORD: mask(e.ADMIN_PASSWORD),
    ML_JWT_SECRET: mask(e.ML_JWT_SECRET),
    ADMIN_JWT_SECRET: mask(e.ADMIN_JWT_SECRET),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(masked, null, 2));
}

// Allow running this file directly for quick checks:
if (require.main === module) {
  const arg = process.argv.slice(2).find(a => a === "--print");
  try {
    const cfg = loadEnv();
    if (arg === "--print") printEnvMasked(cfg);
    else console.log("env loaded OK");
  } catch (err: any) {
    console.error(err?.message || err);
    process.exit(1);
  }
}
