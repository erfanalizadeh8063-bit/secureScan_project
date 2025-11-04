Param(
  [int]$Port = 8080
)
$ErrorActionPreference = "Stop"
Write-Host "Starting backend on 0.0.0.0:$Port ..."
# stop any prior container on this port
docker ps --format "{{.ID}} {{.Ports}}" | Select-String ":$Port->" | ForEach-Object {
  $id = ($_ -split " ")[0]; docker stop $id | Out-Null
}
docker run --rm -p "$Port:8080" sec-back-test | Write-Host

