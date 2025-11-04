$Front = 'https://securascan-front-dd57.onrender.com'
$Back = 'https://securascan-back-dd57.onrender.com'
Write-Output "FRONT_URL: $Front"
Write-Output "BACK_URL:  $Back"

# Fetch HTML
try {
    $resp = Invoke-WebRequest -Uri $Front -UseBasicParsing -ErrorAction Stop
    $html = $resp.Content
} catch {
    Write-Output "ERROR: Unable to fetch front HTML: $_"
    exit 2
}

# Find asset JS files and index-*.js
$assetMatches = [regex]::Matches($html, '/assets/[A-Za-z0-9_\-\.]+\.js') | ForEach-Object { $_.Value } | Select-Object -Unique
$indexMatches = [regex]::Matches($html, 'index-[A-Za-z0-9_\-]+\.js') | ForEach-Object { $_.Value } | Select-Object -Unique

$all = @()
foreach ($m in $assetMatches) { $all += $m }
foreach ($m in $indexMatches) { if (-not ($all -contains $m)) { $all += $m } }

if ($all.Count -eq 0) {
    Write-Output "No JS bundles found in HTML"
} else {
    Write-Output "Found $($all.Count) candidate bundles"
}

$foundAny = $false
$results = @()
foreach ($p in $all) {
    if ($p.StartsWith('http')) { $url = $p }
    elseif ($p.StartsWith('/')) { $url = $Front.TrimEnd('/') + $p }
    else { $url = $Front.TrimEnd('/') + '/' + $p }
    try {
        $js = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
        $content = $js.Content
    } catch {
        Write-Output "WARN: failed to download $url"
        $content = ''
    }
    $contains = $false
    if ($content -and $content -match [regex]::Escape($Back)) { $contains = $true; $foundAny = $true }
    $results += [pscustomobject]@{ url=$url; contains=$contains }
}

# Print results
foreach ($r in $results) {
    if ($r.contains) { $status = 'FOUND' } else { $status = 'MISSING' }
    Write-Output ("ASSET: " + $r.url + " -> " + $status)
}

# Do quick health & CORS checks too
# FRONT HEAD
try { $h1 = Invoke-WebRequest -Uri $Front -Method Head -UseBasicParsing -ErrorAction Stop; $code1 = [int]$h1.StatusCode } catch { $code1 = 0 }
# BACK /healthz
try { $h2 = Invoke-WebRequest -Uri ($Back + '/healthz') -Method Head -UseBasicParsing -ErrorAction Stop; $code2 = [int]$h2.StatusCode } catch { try { $h2 = Invoke-WebRequest -Uri ($Back + '/healthz') -UseBasicParsing -ErrorAction Stop; $code2 = [int]$h2.StatusCode } catch { $code2 = 0 } }
# OPTIONS
$aco=''; $acm=''; $acc=''
try { $r3 = Invoke-WebRequest -Uri ($Back + '/api/scan/demo') -Method Options -Headers @{ Origin = $Front; 'Access-Control-Request-Method' = 'GET' } -UseBasicParsing -ErrorAction Stop; $code3 = [int]$r3.StatusCode; $hdrs = $r3.Headers } catch { if ($_.Exception -and $_.Exception.Response) { $resp = $_.Exception.Response; $code3 = $resp.StatusCode.Value__; $hdrs = $resp.Headers } else { $code3 = 0; $hdrs = @{} } }
if ($hdrs) { $aco = $hdrs['Access-Control-Allow-Origin']; $acm = $hdrs['Access-Control-Allow-Methods']; $acc = $hdrs['Access-Control-Allow-Credentials'] }

# Summary
Write-Output ''
Write-Output '--- SHORT REPORT ---'
if ($code1 -eq 200) { Write-Output '✅ FRONT HEAD 200' } else { Write-Output "❌ FRONT HEAD $code1" }
if ($code2 -eq 200) { Write-Output '✅ BACK /healthz 200' } else { Write-Output "❌ BACK /healthz $code2" }
if (($code3 -in 200,204) -and $aco -and $acm -and $acc) { Write-Output "✅ OPTIONS CORS OK (ACO:$aco)" } else { Write-Output '❌ OPTIONS CORS NG' }
if ($foundAny) { Write-Output '✅ One or more bundles contain BACK_URL' } else { Write-Output '❌ No bundle contains BACK_URL' }
if (-not $foundAny) {
    Write-Output 'CAUSE: VITE_API_BASE not injected at build time or build cache served an old artifact.'
    Write-Output 'NEXT: Clear frontend build cache on Render, set env VITE_API_BASE=https://securascan-back-dd57.onrender.com, rebuild & redeploy.'
} else {
    Write-Output 'NEXT: none — connection looks good.'
}
