# Nightly shutdown & cleanup script
# Safe, non-verbose, single-line success or first error
# Run from repo root automatically: C:\Users\erfan\Desktop\secureScan

$ErrorActionPreference = 'Stop'
$repoRoot = 'C:\Users\erfan\Desktop\secureScan'

try {
    Set-Location -Path $repoRoot
} catch {
    Write-Output "error: cannot set repo root $repoRoot"
    exit 1
}

# 1) Git add/commit/push (push is best-effort)
try {
    git add -A 1>$null 2>&1
} catch {
    Write-Output 'error: git add failed'
    exit 2
}

try {
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m 'chore: nightly checkpoint (auto)' 1>$null 2>&1
    }
} catch {
    Write-Output 'error: git commit failed'
    exit 3
}

# Push (ignore failures, e.g., offline)
try {
    git push 1>$null 2>&1
} catch {
    # non-fatal
}

# 2) Docker compose down (dev)
try {
    docker compose --profile dev down -v 1>$null 2>&1
} catch {
    Write-Output 'error: dev compose down failed'
    exit 4
}

# 2b) Docker compose down (prod)
try {
    docker compose --profile prod down -v 1>$null 2>&1
} catch {
    Write-Output 'error: prod compose down failed'
    exit 5
}

# 3) Remove all containers (if any)
try {
    $ids = docker ps -aq
    if ($ids) {
        foreach ($id in $ids) {
            try {
                docker rm -f $id 1>$null 2>&1
            } catch {
                Write-Output "error: remove container $id failed"
                exit 6
            }
        }
    }
} catch {
    Write-Output 'error: docker ps failed'
    exit 6
}

# 4) Prune docker system with volumes
try {
    docker system prune -f --volumes 1>$null 2>&1
} catch {
    Write-Output 'error: docker prune failed'
    exit 7
}

# 5) Best-effort stop Docker Desktop service and WSL2
try {
    Stop-Service com.docker.service -ErrorAction Stop 1>$null 2>&1
} catch {
    # ignore if unable to stop
}

try {
    wsl --shutdown 1>$null 2>&1
} catch {
    # ignore errors
}

# Success
Write-Output 'successful'
