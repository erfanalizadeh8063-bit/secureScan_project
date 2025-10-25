#!/usr/bin/env pwsh
# Smoke test for SecuraScan (PowerShell)
Set-StrictMode -Version Latest

# Ensure we run from the repository root (script may be invoked from another CWD)
if ($PSScriptRoot) {
    $repoRoot = Join-Path $PSScriptRoot '..' | Resolve-Path -Relative
    Set-Location $repoRoot
}

Write-Host "Stopping any existing compose stacks..."
docker compose down --remove-orphans

Write-Host "Bringing up services (build)..."
docker compose up --build -d

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
