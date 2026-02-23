<#
.DESCRIPTION
    停止 v2-lab 所有基礎設施容器。
.EXAMPLE
    PS> .\scripts\shutdown.ps1
#>

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "Shutting down v2-lab..." -ForegroundColor Yellow
& docker-compose -f docker/docker-compose.yml down

if ($LASTEXITCODE -eq 0) {
    Write-Host "v2-lab shutdown complete." -ForegroundColor Green
} else {
    Write-Host "Shutdown encountered errors. Check docker-compose status." -ForegroundColor Red
    exit 1
}
