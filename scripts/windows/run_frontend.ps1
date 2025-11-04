Param(
  [int]$Port = 3000,
  [int]$ContainerPort = 10000
)
$ErrorActionPreference = "Stop"
Write-Host "Starting frontend on http://localhost:$Port ..."
# stop any prior container on this port
docker ps --format "{{.ID}} {{.Ports}}" | Select-String ":$Port->" | ForEach-Object {
  $id = ($_ -split " ")[0]; docker stop $id | Out-Null
}
docker run --rm -p "$Port:$ContainerPort" sec-front-test | Write-Host

