/**
 * Kori — API Skeleton & Middlewares
 * Stable v0.1 — 2025-10-20
 *
 * Purpose:
 *   Hardened Fastify bootstrap with CORS, security headers, rate limiting,
 *   request correlation (x-request-id), health/readiness/version routes,
 *   OpenAPI JSON route, and consistent error/404 handling.
 *
 * Windows notes:
 *   Repo root: E:\Applications\Kori_web
 *   Run:  npx tsx apps/api/src/server.ts
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import * as dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { APP_NAME } from "@kori/shared";

dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const APP_VERSION = process.env.APP_VERSION ?? "0.1.0";
const LOG_PRETTY = process.env.LOG_PRETTY === "true";

const app = Fastify({
  logger: LOG_PRETTY
    ? { transport: { target: "pino-pretty" }, level: "debug" }
    : { level: "info" },
});

// ---- Core middlewares ----
await app.register(helmet);

// ✅ Preflight-friendly CORS configuration
await app.register(cors, {
  origin: [WEB_ORIGIN],
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  strictPreflight: false, // prevents "Invalid Preflight Request" 400s
  // allowedHeaders can be expanded when client custom headers are known
});

await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

// Echo a stable request id header using Fastify's built-in request.id
app.addHook("onRequest", (req, reply, done) => {
  reply.header("x-request-id", req.id);
  done();
});

// ---- Routes ----
app.get("/healthz", async () => ({ ok: true, app: APP_NAME }));
app.get("/readyz", async () => ({ ready: true }));
app.get("/version", async () => ({ version: APP_VERSION }));

// ✅ Serve the OpenAPI JSON derived from YAML spec
app.get("/openapi.json", async (_req, reply) => {
  const yamlPath = path.resolve(process.cwd(), "apps", "api", "openapi.yaml");
  const raw = fs.readFileSync(yamlPath, "utf8");
  const json = YAML.parse(raw);
  return reply.type("application/json").send(json);
});

// ---- Error & 404 handling ----
app.setErrorHandler((err, _req, reply) => {
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  app.log.error({ err }, "Unhandled error");
  reply.code(status).type("application/json").send({
    error: status === 500 ? "Internal Server Error" : err.message,
  });
});

app.setNotFoundHandler((_req, reply) => {
  reply.code(404).send({ error: "Not Found" });
});

// ---- Boot ----
try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`API listening on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
