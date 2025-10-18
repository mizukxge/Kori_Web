import Fastify from "fastify";
import cors from "@fastify/cors";
import * as dotenv from "dotenv";
import { APP_NAME } from "@kori/shared";

dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const app = Fastify({ logger: true });
await app.register(cors, { origin: [WEB_ORIGIN] });

app.get("/healthz", async () => ({ ok: true, app: APP_NAME }));

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`API listening on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}