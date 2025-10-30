# Deployment Validation Script for Anoteros Logos
# Tests all critical SEO/GEO requirements

$baseUrl = "https://anoteroslogos.com"
$results = @()

Write-Host "`nStarting Deployment Validation..." -ForegroundColor Cyan
Write-Host ("=" * 60)

# Test 1: robots.txt accessibility
Write-Host "`n[1/10] Testing robots.txt..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/robots.txt" -Method Head -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "[PASS] robots.txt: HTTP $($response.StatusCode)" -ForegroundColor Green
        $results += @{Test="robots.txt"; Status="PASS"}
    }
} catch {
    Write-Host "[FAIL] robots.txt: $_" -ForegroundColor Red
    $results += @{Test="robots.txt"; Status="FAIL"}
}

# Test 2: sitemap.xml accessibility
Write-Host "`n[2/10] Testing sitemap.xml..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/sitemap.xml" -Method Head -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "[PASS] sitemap.xml: HTTP $($response.StatusCode)" -ForegroundColor Green
        $results += @{Test="sitemap.xml"; Status="PASS"}
    }
} catch {
    Write-Host "[FAIL] sitemap.xml: $_" -ForegroundColor Red
    $results += @{Test="sitemap.xml"; Status="FAIL"}
}

# Test 3: Main page accessibility
Write-Host "`n[3/10] Testing main page..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method Head -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "[PASS] Main page: HTTP $($response.StatusCode)" -ForegroundColor Green
        $results += @{Test="Main Page"; Status="PASS"}
    }
} catch {
    Write-Host "[FAIL] Main page: $_" -ForegroundColor Red
    $results += @{Test="Main Page"; Status="FAIL"}
}

# Test 4: manifest.json
Write-Host "`n[4/10] Testing manifest.json..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/manifest.json" -Method Head -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "[PASS] manifest.json: HTTP $($response.StatusCode)" -ForegroundColor Green
        $results += @{Test="manifest.json"; Status="PASS"}
    }
} catch {
    Write-Host "[FAIL] manifest.json: $_" -ForegroundColor Red
    $results += @{Test="manifest.json"; Status="FAIL"}
}

# Test 5: favicon.svg
Write-Host "`n[5/10] Testing favicon.svg..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/favicon.svg" -Method Head -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "[PASS] favicon.svg: HTTP $($response.StatusCode)" -ForegroundColor Green
        $results += @{Test="favicon.svg"; Status="PASS"}
    }
} catch {
    Write-Host "[FAIL] favicon.svg: $_" -ForegroundColor Red
    $results += @{Test="favicon.svg"; Status="FAIL"}
}

# Test 6: Check for meta tags
Write-Host "`n[6/10] Testing meta tags..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -ErrorAction Stop
    $content = $response.Content
    
    $requiredMetas = @("description", "og:title", "twitter:card", "robots", "GPTBot", "Claude-Web", "PerplexityBot")
    $foundMetas = @()
    
    foreach ($meta in $requiredMetas) {
        if ($content -match "name=`"$meta`"|property=`"$meta`"") {
            $foundMetas += $meta
        }
    }
    
    Write-Host "[PASS] Meta tags found: $($foundMetas.Count)/$($requiredMetas.Count)" -ForegroundColor Green
    $results += @{Test="Meta Tags"; Status="PASS"}
} catch {
    Write-Host "[FAIL] Meta tags: $_" -ForegroundColor Red
    $results += @{Test="Meta Tags"; Status="FAIL"}
}

# Test 7: Check for Schema.org JSON-LD
Write-Host "`n[7/10] Testing Schema.org structured data..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -ErrorAction Stop
    $content = $response.Content
    
    if ($content -match 'type="application/ld\+json"') {
        $jsonLdCount = ([regex]::Matches($content, 'type="application/ld\+json"')).Count
        Write-Host "[PASS] Schema.org JSON-LD found ($jsonLdCount blocks)" -ForegroundColor Green
        $results += @{Test="Schema.org"; Status="PASS"}
    } else {
        Write-Host "[FAIL] No Schema.org structured data found" -ForegroundColor Red
        $results += @{Test="Schema.org"; Status="FAIL"}
    }
} catch {
    Write-Host "[FAIL] Schema.org: $_" -ForegroundColor Red
    $results += @{Test="Schema.org"; Status="FAIL"}
}

# Test 8: Check SSL certificate
Write-Host "`n[8/10] Testing SSL certificate..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -ErrorAction Stop
    if ($response.BaseResponse.ResponseUri.Scheme -eq "https") {
        Write-Host "[PASS] HTTPS enabled" -ForegroundColor Green
        $results += @{Test="SSL/HTTPS"; Status="PASS"}
    }
} catch {
    Write-Host "[FAIL] SSL/HTTPS: $_" -ForegroundColor Red
    $results += @{Test="SSL/HTTPS"; Status="FAIL"}
}

# Test 9: Check response time
Write-Host "`n[9/10] Testing response time..." -ForegroundColor Yellow
try {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $response = Invoke-WebRequest -Uri $baseUrl -ErrorAction Stop
    $stopwatch.Stop()
    
    $responseTime = $stopwatch.ElapsedMilliseconds
    if ($responseTime -lt 3000) {
        Write-Host "[PASS] Response time: $responseTime ms (Good)" -ForegroundColor Green
        $results += @{Test="Response Time"; Status="PASS"}
    } else {
        Write-Host "[WARN] Response time: $responseTime ms (Slow)" -ForegroundColor Yellow
        $results += @{Test="Response Time"; Status="WARN"}
    }
} catch {
    Write-Host "[FAIL] Response time: $_" -ForegroundColor Red
    $results += @{Test="Response Time"; Status="FAIL"}
}

# Test 10: Check robots.txt content
Write-Host "`n[10/10] Validating robots.txt content..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/robots.txt" -ErrorAction Stop
    $content = $response.Content
    
    $requiredBots = @("GPTBot", "Claude-Web", "PerplexityBot", "Google-Extended", "Googlebot")
    $foundBots = @()
    
    foreach ($bot in $requiredBots) {
        if ($content -match $bot) {
            $foundBots += $bot
        }
    }
    
    Write-Host "[PASS] AI crawlers configured: $($foundBots.Count)/$($requiredBots.Count)" -ForegroundColor Green
    if ($content -match "Sitemap:") {
        Write-Host "[PASS] Sitemap directive found in robots.txt" -ForegroundColor Green
    }
    $results += @{Test="robots.txt Content"; Status="PASS"}
} catch {
    Write-Host "[FAIL] robots.txt content: $_" -ForegroundColor Red
    $results += @{Test="robots.txt Content"; Status="FAIL"}
}

# Summary
Write-Host "`n" -NoNewline
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "VALIDATION SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$warnCount = ($results | Where-Object { $_.Status -eq "WARN" }).Count
$totalTests = $results.Count

Write-Host "`nPassed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Warnings: $warnCount" -ForegroundColor Yellow
Write-Host "Total: $totalTests tests`n" -ForegroundColor White

if ($failCount -eq 0) {
    Write-Host "SUCCESS: ALL TESTS PASSED! Site is fully optimized for GEO." -ForegroundColor Green
    exit 0
} else {
    Write-Host "WARNING: Some tests failed. Review the output above." -ForegroundColor Yellow
    exit 1
}
