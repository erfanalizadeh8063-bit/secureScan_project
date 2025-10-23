Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Check repo root
$cwd = Get-Location
if (-not (Test-Path -Path (Join-Path $cwd '.vscode'))) {
    Write-Error ".vscode directory not found. Run this script from the repository root."
    exit 1
}

# Prepare paths
$date = Get-Date -Format 'yyyy-MM-dd'
$dstPath = Join-Path 'docs/daily_reviews' ("daily_review_$date.md")
$bashPath = 'C:\Program Files\Git\bin\bash.exe'
$bashScript = '.vscode/daily_review.sh'
$created = $false

# Detect Bash availability (PowerShell 5/7 safe)
$hasBash = (Test-Path $bashPath) -and (Test-Path $bashScript)

# Try Bash first (run in QUIET mode, silence stdout/stderr)
if ($hasBash) {
    Write-Host "Git Bash found - running daily_review.sh in QUIET mode..."
    try {
    # Set QUIET env, run script, redirect all output to null (use absolute bash path)
    & "C:\Program Files\Git\bin\bash.exe" -lc "QUIET=1 ./.vscode/daily_review.sh" *> $null
        # Small delay and re-check
        Start-Sleep -Milliseconds 300
        $created = Test-Path $dstPath
    }
    catch {
        Write-Warning "Bash execution failed, switching to PowerShell fallback..."
        $created = $false
    }
}
else {
    Write-Host "Git Bash not available or script missing; will run PowerShell fallback if needed..."
}

# PowerShell fallback (only if not created yet)
if (-not $created) {
    Write-Host "Running PowerShell fallback to create the daily review file..."
    $dir = 'docs/daily_reviews'
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

    $tpl = 'docs/daily_reviews/_template.md'
    if (!(Test-Path $tpl)) {
        $content = "# Daily review - {{DATE}}`n`n- Done:`n`n- Next:`n`n- Risks:`n`n- Notes:`n"
        Set-Content -Path $tpl -Value $content -NoNewline -Encoding UTF8
    }

    (Get-Content $tpl -Raw).Replace('{{DATE}}', $date) | Set-Content $dstPath -Encoding UTF8
    $created = Test-Path $dstPath
}

# Final output
if ($created) {
    Write-Host "Created $dstPath"
    Write-Host "successful ✅"
}
else {
    Write-Error "Failed to create $dstPath"
    exit 1
}
