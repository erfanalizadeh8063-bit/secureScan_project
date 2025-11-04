$Front = 'https://securascan-front-dd57.onrender.com'
$Back = 'https://securascan-back-dd57.onrender.com'
Write-Output "FRONT_URL $Front"
# Step1 - HEAD front
try { $r1 = Invoke-WebRequest -Uri $Front -Method Head -UseBasicParsing -ErrorAction Stop; $code1 = [int]$r1.StatusCode } catch { $code1 = 0 }
Write-Output "STEP1_CODE:$code1"
# Step2 - HEAD healthz (fallback to GET)
try { $r2 = Invoke-WebRequest -Uri ($Back + '/healthz') -Method Head -UseBasicParsing -ErrorAction Stop; $code2 = [int]$r2.StatusCode } catch { try { $r2 = Invoke-WebRequest -Uri ($Back + '/healthz') -Method Get -UseBasicParsing -ErrorAction Stop; $code2 = [int]$r2.StatusCode } catch { $code2 = 0 } }
Write-Output "STEP2_CODE:$code2"
# Step3 - OPTIONS for CORS
$h_aco=''; $h_acm=''; $h_acc=''
try {
    $r3 = Invoke-WebRequest -Uri ($Back + '/api/scan/demo') -Method Options -Headers @{ Origin = $Front; 'Access-Control-Request-Method' = 'GET' } -UseBasicParsing -ErrorAction Stop
    $code3 = [int]$r3.StatusCode
    $hdrs = $r3.Headers
} catch {
    if ($_.Exception -and $_.Exception.Response) {
        $resp = $_.Exception.Response
        $code3 = $resp.StatusCode.Value__
        $hdrs = $resp.Headers
    } else {
        $code3 = 0; $hdrs = @{}
    }
}
if ($hdrs) {
    $h_aco = $hdrs['Access-Control-Allow-Origin']
    $h_acm = $hdrs['Access-Control-Allow-Methods']
    $h_acc = $hdrs['Access-Control-Allow-Credentials']
}
Write-Output "STEP3_CODE:$code3"
Write-Output "STEP3_ACO:$h_aco"
Write-Output "STEP3_ACM:$h_acm"
Write-Output "STEP3_ACC:$h_acc"
# Step4 - find bundle
$jsUrl = ''
try {
    $html = Invoke-WebRequest -Uri $Front -UseBasicParsing -ErrorAction Stop
    $c = $html.Content
    $m = [regex]::Match($c, 'src="(?<s>[^"] *index-[^" ]+\.js)"')
    if ($m.Success) { $jsPath = $m.Groups['s'].Value } else {
        $m2 = [regex]::Match($c, 'index-[A-Za-z0-9_\-]+\.js')
        if ($m2.Success) { $jsPath = $m2.Value } else { $jsPath = '' }
    }
} catch {
    $jsPath = ''
}
if ($jsPath -ne '') {
    if ($jsPath.StartsWith('http')) { $jsUrl = $jsPath }
    elseif ($jsPath.StartsWith('/')) { $jsUrl = $Front.TrimEnd('/') + $jsPath }
    else { $jsUrl = $Front.TrimEnd('/') + '/' + $jsPath }
}
Write-Output "STEP4_JSURL:$jsUrl"
# Step5 - fetch JS and check for backend URL
$contains = $false
if ($jsUrl -ne '') {
    try { $js = Invoke-WebRequest -Uri $jsUrl -UseBasicParsing -ErrorAction Stop; if ($js.Content -like '*https://securascan-back-dd57.onrender.com*') { $contains = $true } } catch { $contains = $false }
}
Write-Output "STEP5_CONTAINS_BACK:$contains"
# Short report
$line1 = if ($code1 -eq 200) { '✅ FRONT HEAD 200' } else { "❌ FRONT HEAD $code1" }
$line2 = if ($code2 -eq 200) { '✅ BACK /healthz 200' } else { "❌ BACK /healthz $code2" }
$line3 = if (($code3 -in 200,204) -and $h_aco -and $h_acm -and $h_acc) { '✅ OPTIONS CORS headers present' } else { '❌ OPTIONS CORS missing/insufficient' }
$line4 = if ($contains) { '✅ bundle contains BACK_URL' } else { '❌ bundle missing BACK_URL' }
Write-Output ''
Write-Output '--- SHORT REPORT ---'
Write-Output $line1
Write-Output $line2
Write-Output $line3
Write-Output $line4
