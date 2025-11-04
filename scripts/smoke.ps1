<#
Run local smoke tests on Windows PowerShell/PowerShell Core.
Checks backend /healthz and frontend root after starting compose --profile prod.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "Running smoke tests (PowerShell)..." -ForegroundColor Cyan
$root = Join-Path $PSScriptRoot '..' | Resolve-Path -Relative
Set-Location $root

Write-Host "Bringing down any existing compose stack..." -ForegroundColor Yellow
try { & docker compose down --remove-orphans } catch { }

Write-Host "Building backend (no-cache)..." -ForegroundColor Yellow
& docker compose build --no-cache --progress=plain backend

Write-Host "Starting prod profile..." -ForegroundColor Yellow
& docker compose --profile prod up -d
Start-Sleep -Seconds 4

Write-Host "Checking backend /healthz (http://localhost:8080/healthz)" -ForegroundColor Cyan
try {
  $resp = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/healthz' -Method GET -TimeoutSec 5 -ErrorAction Stop
  $hc = $resp.StatusCode
} catch {
  $hc = $null
}
if ($hc -ne 200) {
  Write-Host "Backend health failed: $hc" -ForegroundColor Red
  Write-Host "--- Backend logs ---" -ForegroundColor Yellow
  try { & docker compose logs backend --tail=200 } catch { }
  exit 2
}
Write-Host "Backend healthy" -ForegroundColor Green

Write-Host "Checking frontend root (http://localhost:3000)" -ForegroundColor Cyan
try {
  $resp2 = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -Method GET -TimeoutSec 5 -ErrorAction Stop
  $code = $resp2.StatusCode
} catch {
  $code = $null
}
if ($code -ne 200 -and $code -ne 304) {
  Write-Host "Frontend check failed: $code" -ForegroundColor Red
  Write-Host "--- Frontend logs ---" -ForegroundColor Yellow
  try { & docker compose logs frontend --tail=200 } catch { }
  exit 3
}
Write-Host "Frontend served (status: $code)" -ForegroundColor Green
Write-Host "Smoke tests passed" -ForegroundColor Green
#!/usr/bin/env pwsh
# Smoke test for SecuraScan (PowerShell)
Set-StrictMode -Version Latest

# Ensure we run from the repository root (script may be invoked from another CWD)
if ($PSScriptRoot) {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
    Set-Location $repoRoot
}

Write-Host "Stopping any existing compose stacks..."
docker compose down --remove-orphans

Write-Host "Bringing up services (build) (prod profile)..."
docker compose --profile prod up --build -d

Start-Sleep -Seconds 4

$backend = 'http://localhost:8080/healthz'
$frontend = 'http://localhost:3000'

Write-Host "Checking backend: $backend"
try {
    $resp = curl -UseBasicParsing -Uri $backend -TimeoutSec 5
    if ($resp.StatusCode -eq 200) { Write-Host "Backend healthy (200)" } else { Write-Host "Backend returned status $($resp.StatusCode)"; exit 2 }
} catch {
    Write-Host "Backend healthcheck failed: $_"
    Write-Host "Tailing logs..."
    docker compose logs --tail 80 backend
    exit 3
}

Write-Host "Checking frontend: $frontend"
try {
    $resp = curl -UseBasicParsing -Uri $frontend -TimeoutSec 5
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) { Write-Host "Frontend served (status $($resp.StatusCode))" } else { Write-Host "Frontend returned status $($resp.StatusCode)"; exit 4 }
} catch {
    Write-Host "Frontend check failed: $_"
    Write-Host "Tailing frontend logs..."
    docker compose logs --tail 80 frontend
    exit 5
}

Write-Host "All smoke checks passed ✅"
exit 0
