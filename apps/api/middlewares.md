\# Kori API — Middlewares \& Operational Defaults



Stable v0.1 — 2025-10-20  

Scope: Document the default middlewares and how to configure/verify them in local dev on Windows.



---



\## Overview

The API uses Fastify with production-minded defaults:

\- \*\*Helmet\*\*: sets common security headers.

\- \*\*CORS\*\*: restricts cross-origin requests to the configured web app origin.

\- \*\*Rate Limit\*\*: mitigates abuse with a simple IP-based limiter.

\- \*\*Request Correlation\*\*: echoes Fastify’s `request.id` as `x-request-id`.

\- \*\*Error Shape\*\*: consistent `{ error: string }` payloads for non-2xx.

\- \*\*Not Found\*\*: `{ error: "Not Found" }`.



All of these are configured in `apps/api/src/server.ts`.



---



\## Configuration (Env Vars)

| Variable | Default | Purpose |

|---|---|---|

| `PORT` | `4000` | API listening port |

| `WEB\_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

| `LOG\_PRETTY` | `false` | Pretty/dev logging via `pino-pretty` |

| `APP\_VERSION` | `0.1.0` | Value returned by `/version` |



> Place these in `apps/api/.env` or export in your PowerShell session.



\### Windows Quick Start

```powershell

cd E:\\Applications\\Kori\_web

$env:PORT="4000"; $env:WEB\_ORIGIN="http://localhost:5173"; $env:LOG\_PRETTY="true"; $env:APP\_VERSION="0.1.0"

npx tsx .\\apps\\api\\src\\server.ts



