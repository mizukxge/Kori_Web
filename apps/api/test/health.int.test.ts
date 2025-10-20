/**
 * Kori — API Integration Tests (health/version/404)
 * Stable v0.1 — 2025-10-20
 */
import { spawn, type ChildProcessWithoutNullStreams, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let proc: ChildProcessWithoutNullStreams | null = null;
const PORT = process.env.TEST_API_PORT ? Number(process.env.TEST_API_PORT) : 4001;
const BASE = `http://127.0.0.1:${PORT}`; // use IPv4 to avoid ::1 issues on Windows

async function buildSharedIfNeeded() {
  // Ensure @kori/shared is built (monorepo predev step); keeps server imports from failing.
  const isWin = process.platform === 'win32';
  const r = spawnSync('pnpm', ['-C', 'packages/shared', 'build'], {
    stdio: 'inherit',
    shell: isWin,
    cwd: process.cwd(),
    env: process.env
  });
  if (r.status !== 0) {
    throw new Error('Failed to build packages/shared before tests.');
  }
}

async function startServer() {
  await buildSharedIfNeeded();

  const isWin = process.platform === 'win32';
  const tsxCmd = 'tsx'; // let shell/ENV resolve it
  const entry = resolve(process.cwd(), 'apps', 'api', 'src', 'server.ts');

  // Ensure node_modules/.bin is on PATH so tsx is resolvable
  const binDir = resolve(process.cwd(), 'node_modules', '.bin');
  const PATH_KEY = Object.keys(process.env).find(k => k.toLowerCase() === 'path') || 'PATH';
  const pathSep = isWin ? ';' : ':';

  const env = {
    ...process.env,
    [PATH_KEY]: `${binDir}${pathSep}${process.env[PATH_KEY] ?? ''}`,
    PORT: String(PORT),
    WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    LOG_PRETTY: 'false',
    APP_VERSION: process.env.APP_VERSION ?? '0.1.0',
    FORCE_COLOR: '1',
    NODE_ENV: 'test'
  };

  proc = spawn(tsxCmd, [entry], {
    env,
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin // ✅ Windows-safe spawn
  });

  // surface errors
  proc.stderr.on('data', (buf) => {
    // eslint-disable-next-line no-console
    console.error(buf.toString());
  });

  // Poll the health endpoint until ready (max 10s)
  const started = await waitForReady(`${BASE}/healthz`, 10_000);
  if (!started) throw new Error('Server did not become ready within 10s');
}

async function waitForReady(url: string, timeoutMs: number) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // ignore until timeout
    }
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function stopServer() {
  if (!proc) return;
  proc.kill('SIGTERM');
  try { await once(proc, 'exit'); } catch { /* ignore */ }
  proc = null;
}

beforeAll(async () => {
  await startServer();
});

afterAll(async () => {
  await stopServer();
});

describe('API skeleton', () => {
  it('GET /healthz -> { ok: true, app }', async () => {
    const res = await fetch(`${BASE}/healthz`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('ok', true);
    expect(json).toHaveProperty('app');
  });

  it('GET /version -> { version }', async () => {
    const res = await fetch(`${BASE}/version`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('version');
    expect(typeof json.version).toBe('string');
  });

  it('GET /__nope -> 404 { error: "Not Found" }', async () => {
    const res = await fetch(`${BASE}/__nope`);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: 'Not Found' });
  });
});
