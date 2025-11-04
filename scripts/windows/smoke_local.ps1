Param(
  [string]$Backend = "http://localhost:8080",
  [string]$Frontend = "http://localhost:3000"
)
$ErrorActionPreference = "Stop"

Write-Host "==> Checking backend /healthz at $Backend/healthz"
try {
  $b = Invoke-WebRequest -UseBasicParsing "$Backend/healthz" -TimeoutSec 10
  if ($b.StatusCode -ne 200) { throw "Backend status: $($b.StatusCode)" }
  Write-Host "BACK OK:" ($b.Content.Substring(0, [Math]::Min(200, $b.Content.Length)))
} catch {
  Write-Error "Backend health failed: $_"; exit 1
}

Write-Host "==> Checking frontend SPA route /healthz in a browser (JS required)"
Write-Host "Open: $Frontend/healthz"
Write-Host ""
Write-Host "NOTE: curl/Invoke-WebRequest won't execute JS. For a curlable static check, we also verify /__ping.txt if it exists."

# Optional static ping (if present)
try {
  $f = Invoke-WebRequest -UseBasicParsing "$Frontend/__ping.txt" -TimeoutSec 5
  if ($f.StatusCode -eq 200) { Write-Host "FRONT static ping OK: $($f.Content.Trim())" }
} catch { Write-Host "FRONT static ping not found (ok). Use browser for SPA test." }

