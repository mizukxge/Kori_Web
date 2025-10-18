# Stable v0.1 — 2025-10-19
# Monorepo Scaffold Script for Kori (Windows-first)
# Changelog: initial runnable slice (root + API + Web + Shared), Fastify / Vite, pnpm workspaces.

param(
  [string]$Root = "E:\Applications\Kori_web"
)

$ErrorActionPreference = 'Stop'

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Path $Path | Out-Null }
}

function Write-Text {
  param([string]$Path,[string]$Content)
  Ensure-Dir (Split-Path -Parent $Path)
  # Write UTF-8 *without* BOM to avoid JSON parse issues in Node/Vite
  if ($PSVersionTable.PSVersion.Major -ge 7) {
    Set-Content -Path $Path -Value $Content -Encoding utf8NoBOM
  } else {
    # Fallback for Windows PowerShell 5.x: use .NET to write UTF8 without BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
  }
  Write-Host "Wrote: $Path"
}

Write-Host "⛏️  Creating Kori monorepo at $Root" -ForegroundColor Cyan
Ensure-Dir $Root
Ensure-Dir "$Root\apps\api\src"
Ensure-Dir "$Root\apps\web\src"
Ensure-Dir "$Root\packages\shared\src"
Ensure-Dir "$Root\.github\workflows"

# ----------------
# Root files
# ----------------
$rootPackage = @'
{
  "name": "kori-monorepo",
  "private": true,
  "packageManager": "pnpm@9",
  "scripts": {
    "dev": "pnpm -r --parallel --filter ./apps/* run dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test"
  }
}
'@
Write-Text "$Root\package.json" $rootPackage

$workspace = @'
packages:
  - "apps/*"
  - "packages/*"
'@
Write-Text "$Root\pnpm-workspace.yaml" $workspace

$tsbase = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "types": ["node"],
    "baseUrl": "."
  }
}
'@
Write-Text "$Root\tsconfig.base.json" $tsbase

$eslint = @'
{
  "root": true,
  "env": { "es2021": true, "node": true, "browser": true },
  "extends": ["eslint:recommended", "plugin:react/recommended", "plugin:@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react"],
  "settings": { "react": { "version": "detect" } },
  "ignorePatterns": ["dist", "node_modules"],
  "rules": { }
}
'@
Write-Text "$Root\.eslintrc.json" $eslint

$gitignore = @'
node_modules
.dist
*.log
.env
.env.*
dist
.vscode
.DS_Store
'@
Write-Text "$Root\.gitignore" $gitignore

# ----------------
# packages/shared
# ----------------
$sharedPkg = @'
{
  "name": "@kori/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "echo no lint yet",
    "test": "echo no tests yet"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
'@
Write-Text "$Root\packages\shared\package.json" $sharedPkg

$sharedTs = @'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src"]
}
'@
Write-Text "$Root\packages\shared\tsconfig.json" $sharedTs

$sharedIndex = @'
export const APP_NAME = "Kori" as const;
'@
Write-Text "$Root\packages\shared\src\index.ts" $sharedIndex

# ----------------
# apps/api (Fastify)
# ----------------
$apiPkg = @'
{
  "name": "@kori/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "echo no lint yet",
    "test": "echo no tests yet"
  },
  "dependencies": {
    "fastify": "^4.28.1",
    "@fastify/cors": "^10.0.1",
    "dotenv": "^16.4.5",
    "@kori/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "tsx": "^4.19.1",
    "@types/node": "^20.14.12"
  }
}
'@
Write-Text "$Root\apps\api\package.json" $apiPkg

$apiTs = @'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
'@
Write-Text "$Root\apps\api\tsconfig.json" $apiTs

$apiEnvEx = @'
# API port
PORT=4000
# Allowed CORS origin for web dev
WEB_ORIGIN=http://localhost:5173
'@
Write-Text "$Root\apps\api\.env.example" $apiEnvEx

$serverTs = @'
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
'@
Write-Text "$Root\apps\api\src\server.ts" $serverTs

# ----------------
# apps/web (Vite + React)
# ----------------
$webPkg = @'
{
  "name": "@kori/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview --port 5173",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "echo no lint yet",
    "test": "echo no tests yet"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@kori/shared": "workspace:*"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.6.3"
  }
}
'@
Write-Text "$Root\apps\web\package.json" $webPkg

$webTs = @'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src", "vite.config.ts"]
}
'@
Write-Text "$Root\apps\web\tsconfig.json" $webTs

$indexHtml = @'
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kori</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
'@
Write-Text "$Root\apps\web\index.html" $indexHtml

$mainTsx = @'
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'@
Write-Text "$Root\apps\web\src\main.tsx" $mainTsx

$appTsx = @'
import React, { useEffect, useState } from "react";

export function App() {
  const [status, setStatus] = useState<string>("Loading...");

  useEffect(() => {
    fetch("http://localhost:4000/healthz")
      .then(r => r.json())
      .then(data => setStatus(data?.ok ? "API OK" : "API DOWN"))
      .catch(() => setStatus("API DOWN"));
  }, []);

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Kori</h1>
      <p>Backend status: <strong>{status}</strong></p>
    </div>
  );
}
'@
Write-Text "$Root\apps\web\src\App.tsx" $appTsx

$viteCfg = @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
});
'@
Write-Text "$Root\apps\web\vite.config.ts" $viteCfg

Write-Host "✅ Files written. Next steps:" -ForegroundColor Green
Write-Host "1) corepack enable; corepack prepare pnpm@9 --activate"
Write-Host "2) cd $Root"
Write-Host "3) pnpm install"
Write-Host "4) Copy E:\\Applications\\Kori_web\\apps\\api\\.env.example to .env and adjust if needed"
Write-Host "5) pnpm dev"
