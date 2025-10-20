# 📜 Kori — Canvas Registry

**Location:** `E:\Applications\Kori_web`  
**Stable Version:** v0.1 — 2025-10-20  
**Maintainer Chat:** 05 — API Skeleton & Middlewares  

---

## 🧩 Active Canvases

| Canvas | Path | Purpose | Stable | Status |
|:--|:--|:--|:--:|:--:|
| **server.ts** | `apps/api/src/server.ts` | Fastify API bootstrap with middlewares, error/404 handler, `/openapi.json` route. | ✅ v0.1 | Complete |
| **api-contract.md** | `apps/api/api-contract.md` | API surface definition, OpenAPI stub (links to `openapi.yaml`). | ✅ v0.1 | Complete |
| **openapi.yaml** | `apps/api/openapi.yaml` | YAML source of truth for OpenAPI 3.1 spec (validated with Redocly). | ✅ v0.1 | Complete |
| **middlewares.md** | `apps/api/middlewares.md` | Documentation of operational defaults (CORS, Helmet, rate-limit, request-id). | ✅ v0.1 | Complete |
| **vitest.config.ts** | `apps/api/vitest.config.ts` | Test configuration for API integration tests. | ✅ v0.1 | Complete |
| **health.int.test.ts** | `apps/api/test/health.int.test.ts` | Integration test verifying `/healthz`, `/version`, `/404`. | ✅ v0.1 | Complete |

---

## 🧾 Stable v0.1 Changelog — 2025-10-20
- ✅ Created Fastify API skeleton (`server.ts`) with:
  - Helmet, CORS (preflight-friendly), Rate Limit, x-request-id
  - `/healthz`, `/readyz`, `/version`, `/openapi.json`
  - JSON error and 404 handlers
- ✅ Validated OpenAPI spec (`openapi.yaml`) using Redocly.
- ✅ Added middleware documentation and env configuration notes.
- ✅ Added full Vitest suite and CI-ready scripts (`dev:api`, `test:api`, `lint:openapi`).
- ✅ Confirmed tests passing (3/3) on Windows with coverage generation.
- ✅ Served `openapi.json` endpoint from YAML for future Swagger UI.
- ✅ Verified `pnpm dev:api` and `pnpm test:api` end-to-end.

---

## 🧭 Next Milestones
| Step | Target | Deliverable |
|:--|:--|:--|
| 6.1 | Coverage/Unit Tests | Add `fastify.inject()` tests for 80 % coverage. |
| 6.2 | CI Hook | Redocly lint + Vitest run on pull request. |
| 6.3 | API Docs | Serve Swagger UI from `/docs` using `/openapi.json`. |

---

## 🔄 Rollback Instructions
If new changes break build/tests:
```powershell
git restore apps/api/src/server.ts
git restore apps/api/openapi.yaml
git restore apps/api/test/health.int.test.ts
