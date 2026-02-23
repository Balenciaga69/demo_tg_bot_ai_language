<#
.DESCRIPTION
    驗證 v2-lab 的 lint 與 build 狀態。
.PARAMETER All
    構建所有包
.EXAMPLE
    PS> .\scripts\validate.ps1 -All
#>

param(
    [switch]$All = $false
)

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   v2-lab Validation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# [1/2] Lint
Write-Host "`n[1/2] Running ESLint..." -ForegroundColor Yellow
$lintResult = & cmd /c "pnpm run lint" 2>&1
$lintExitCode = $LASTEXITCODE
Write-Host $lintResult

if ($lintExitCode -eq 0) {
    Write-Host "Lint: PASSED" -ForegroundColor Green
}
else {
    Write-Host "Lint: FAILED (Exit Code: $lintExitCode)" -ForegroundColor Red
    exit 1
}

# [2/2] Build
Write-Host "`n[2/2] Building..." -ForegroundColor Yellow
if ($All) {
    $buildResult = & cmd /c "pnpm run build:all" 2>&1
}
else {
    $buildResult = & cmd /c "pnpm run build:api-gateway" 2>&1
}
$buildExitCode = $LASTEXITCODE
Write-Host $buildResult

if ($buildExitCode -eq 0) {
    Write-Host "Build: PASSED" -ForegroundColor Green
}
else {
    Write-Host "Build: FAILED (Exit Code: $buildExitCode)" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll validations passed." -ForegroundColor Green
