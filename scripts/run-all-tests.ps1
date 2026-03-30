param(
  [switch]$SkipE2E
)

$ErrorActionPreference = "Stop"

Write-Host "== Backend: pytest ==" -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "..\backend")
try {
  py -m pytest
} finally {
  Pop-Location
}

Write-Host "== Frontend: build ==" -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "..\frontend")
try {
  npm run build

  if (-not $SkipE2E) {
    Write-Host "== Frontend: Playwright E2E ==" -ForegroundColor Cyan
    npm run test:e2e
  } else {
    Write-Host "== Skipping E2E ==" -ForegroundColor Yellow
  }
} finally {
  Pop-Location
}

Write-Host "All checks passed." -ForegroundColor Green

