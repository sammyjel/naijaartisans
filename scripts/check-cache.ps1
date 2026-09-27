# Verifies the ISR work actually reached the CDN.
#
#   .\scripts\check-cache.ps1 -Site https://your-preview.vercel.app
#
# Why a script rather than a curl one-liner: PowerShell aliases `curl` to
# Invoke-WebRequest, which ignores curl's flags, so the usual copy-pasted header
# check silently measures the wrong thing.
#
# Each URL is requested TWICE on purpose. The first request populates the ISR
# cache; only the second can legitimately be a HIT.

param(
  [Parameter(Mandatory = $true)]
  [string]$Site
)

$Site = $Site.TrimEnd('/')
if ($Site -notmatch '^https?://') { $Site = "https://$Site" }

# Pages that MUST be cached after this release.
$cacheable = @('/', '/services', '/services/plumbing', '/services/plumbing/lagos', '/sitemap.xml')

# Pages that must NEVER be cached: they read searchParams, cookies, or private data.
$mustNotCache = @('/browse', '/jobs', '/dashboard', '/api/categories')

function Get-Probe($url) {
  try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-WebRequest -Uri $url -Method Get -MaximumRedirection 5 -SkipHttpErrorCheck -TimeoutSec 30
    $sw.Stop()

    # Vercel Deployment Protection serves its SSO login page with HTTP *200*, not
    # 401. Without this check every URL looks like a healthy cached page and the
    # whole run silently measures Vercel's login screen instead of the site -
    # which is exactly what happened on 2026-09-27 and produced a false PASS.
    $isAuthWall = ($r.Content -match '<title>\s*Login\s*.\s*Vercel\s*</title>') -or
                  ($r.Content -match 'Authentication Required') -or
                  ($r.Headers['x-matched-path'] -join ',') -eq '/login' -and $url -notmatch '/login$'

    return [pscustomobject]@{
      Ok       = $true
      Status   = [int]$r.StatusCode
      Cache    = ($r.Headers['x-vercel-cache'] -join ',')
      CC       = ($r.Headers['cache-control']  -join ',')
      Ms       = $sw.ElapsedMilliseconds
      AuthWall = $isAuthWall
      Err      = ''
    }
  } catch {
    return [pscustomobject]@{
      Ok = $false; Status = 0; Cache = ''; CC = ''; Ms = 0; AuthWall = $false; Err = $_.Exception.Message
    }
  }
}

# Fail fast: if the host itself is unreachable, every check below would "fail"
# for a reason that has nothing to do with caching.
Write-Host ""
Write-Host "Probing $Site ..." -ForegroundColor Cyan
$probe = Get-Probe "$Site/"
if (-not $probe.Ok) {
  Write-Host ""
  Write-Host "CANNOT REACH THE SITE - nothing below would be meaningful." -ForegroundColor Red
  Write-Host "  $($probe.Err)" -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "Check the URL. For a Vercel preview it looks like:" -ForegroundColor Yellow
  Write-Host "  https://naijaartisans-git-liquidity-release-<scope>.vercel.app" -ForegroundColor Yellow
  exit 1
}
if ($probe.AuthWall) {
  Write-Host ""
  Write-Host "VERCEL DEPLOYMENT PROTECTION IS ON - every result would be its login page." -ForegroundColor Red
  Write-Host "  It answers HTTP 200, so this is not visible from the status code alone." -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "Fix one of these, then re-run:" -ForegroundColor Yellow
  Write-Host "  - Vercel > Project > Settings > Deployment Protection > disable for Preview" -ForegroundColor Yellow
  Write-Host "  - or append a bypass:  ?x-vercel-protection-bypass=<AUTOMATION_SECRET>" -ForegroundColor Yellow
  Write-Host "  - or verify locally:   next build && next start, then probe 127.0.0.1" -ForegroundColor Yellow
  Write-Host ""
  exit 2
}
if ($probe.Status -ge 400) {
  Write-Host "  Site responded HTTP $($probe.Status) - results below may not reflect your pages." -ForegroundColor Yellow
}

$fail = 0
$reachFail = 0

Write-Host ""
Write-Host "SHOULD BE CACHED  (second hit must be HIT/STALE, never no-store)" -ForegroundColor Cyan
Write-Host ("-" * 78)

foreach ($path in $cacheable) {
  $url = "$Site$path"
  $null = Get-Probe $url            # warm the cache
  $r    = Get-Probe $url            # the one that counts

  if (-not $r.Ok) {
    $reachFail++; $fail++
    Write-Host ("{0,-34} REQUEST FAILED" -f $path) -ForegroundColor Red
    Write-Host ("    {0}" -f $r.Err) -ForegroundColor DarkGray
    continue
  }

  $cacheOk = $r.Cache -match 'HIT|STALE'
  $storeOk = ($r.CC -notmatch 'no-store') -and ($r.CC -ne '')
  $pass    = $cacheOk -and $storeOk
  if (-not $pass) { $fail++ }

  $colour = 'Red'
  if ($pass) { $colour = 'Green' }

  Write-Host ("{0,-34} {1,-4} {2,-16} {3,6}ms" -f $path, $r.Status, $r.Cache, $r.Ms) -ForegroundColor $colour
  Write-Host ("    cache-control: {0}" -f $r.CC) -ForegroundColor DarkGray
  if (-not $cacheOk) { Write-Host "    ^ expected HIT or STALE, got '$($r.Cache)'" -ForegroundColor Red }
  if (-not $storeOk) { Write-Host "    ^ still no-store: this page did NOT become cacheable" -ForegroundColor Red }
}

Write-Host ""
Write-Host "MUST NOT BE CACHED  (private / searchParams pages)" -ForegroundColor Cyan
Write-Host ("-" * 78)

foreach ($path in $mustNotCache) {
  $url = "$Site$path"
  $r   = Get-Probe $url

  if (-not $r.Ok) {
    $reachFail++; $fail++
    Write-Host ("{0,-34} REQUEST FAILED" -f $path) -ForegroundColor Red
    Write-Host ("    {0}" -f $r.Err) -ForegroundColor DarkGray
    continue
  }

  $ok = $r.CC -match 'no-store'
  if (-not $ok) { $fail++ }

  $colour = 'Red'
  if ($ok) { $colour = 'Green' }

  Write-Host ("{0,-34} {1,-4} {2}" -f $path, $r.Status, $r.CC) -ForegroundColor $colour
  if (-not $ok) { Write-Host "    ^ LEAK RISK: this must never be shared from a CDN" -ForegroundColor Red }
}

Write-Host ""
if ($fail -eq 0) {
  Write-Host "PASS - ISR is live and private pages stay private." -ForegroundColor Green
} elseif ($reachFail -gt 0) {
  Write-Host "$fail check(s) failed, $reachFail of them because the request never completed." -ForegroundColor Red
  Write-Host "Fix reachability first - the rest of the results mean nothing until then." -ForegroundColor Yellow
} else {
  Write-Host "$fail check(s) failed - see the red lines above." -ForegroundColor Red
}
Write-Host ""
Write-Host "Baseline before this release: no-store, MISS on 4/4, TTFB 630-930ms" -ForegroundColor DarkGray
