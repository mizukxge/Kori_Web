<#
Stable v0.1 — 2025-10-19
Kori — Local CI Dry-Run Helper

Runs the same steps as CI: install → optional API .env prep → typecheck → build → test.
Creates a timestamped transcript under ./logs/ and returns non-zero on failure.
#>

[CmdletBinding()]
param(
  [switch]$NoEnvCopy,
  [switch]$Clean,
  [string]$PnpmVersion = '9'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSCommandPath | Split-Path -Parent  # scripts/ -> repo root
Set-Location $repoRoot

# Ensure logs folder
$logs = Join-Path $repoRoot 'logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$stamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$logFile = Join-Path $logs "scaffold-$stamp.log"
Start-Transcript -Path $logFile -Append | Out-Null

function Stop-WithError([string]$msg, [int]$code = 1) {
  Write-Error $msg
  Stop-Transcript | Out-Null
  exit $code
}

function Run-Step([string]$name, [scriptblock]$action) {
  Write-Host "➤ $name" -ForegroundColor Cyan
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  & $action
  $sw.Stop()
  Write-Host "✓ $name ($($sw.Elapsed.ToString()))" -ForegroundColor Green
}

# Optional clean to mimic fresh CI
if ($Clean) {
  Write-Host 'Cleaning node_modules and pnpm store...' -ForegroundColor Yellow
  if (Test-Path .pnpm-store) { Remove-Item .pnpm-store -Recurse -Force -ErrorAction SilentlyContinue }
  Get-ChildItem -Path . -Recurse -Directory -Filter 'node_modules' -ErrorAction SilentlyContinue | ForEach-Object {
    try { Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop } catch {}
  }
}

# Ensure pnpm available; fall back to Corepack
$pnpmOk = $false
try { pnpm -v | Out-Null; $pnpmOk = $true } catch {}
if (-not $pnpmOk) {
  Write-Host 'pnpm not found — enabling via Corepack...' -ForegroundColor Yellow
  try {
    corepack enable
    corepack prepare "pnpm@$PnpmVersion" --activate
  } catch { Stop-WithError 'Failed to activate pnpm via Corepack.' }
}

try {
  Run-Step 'Install dependencies (workspace)' { pnpm install --frozen-lockfile }

  if (-not $NoEnvCopy -and (Test-Path 'apps/api/.env.example')) {
    Run-Step 'Prepare API env (copy .env.example → .env)' { Copy-Item 'apps/api/.env.example' 'apps/api/.env' -Force }
  }

  Run-Step 'Typecheck' { pnpm -r typecheck }
  Run-Step 'Build' { pnpm -r build }
  Run-Step 'Test (if present)' { pnpm -r test --if-present }
}
catch {
  Stop-WithError ("Step failed: " + $_.Exception.Message)
}
finally {
  Stop-Transcript | Out-Null
}

Write-Host "All steps completed. Log: $logFile" -ForegroundColor Green
exit 0
