<#
.DESCRIPTION
    啟動整個 v2-lab 開發環境。
.PARAMETER Services
    要啟動的服務：all, infra, app
.EXAMPLE
    PS> .\scripts\startup.ps1 -Services all
    PS> .\scripts\startup.ps1 -Services infra
#>

param(
    [ValidateSet('all', 'infra', 'app')]
    [string]$Services = 'all'
)

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   v2-lab Startup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if ($Services -eq 'infra' -or $Services -eq 'all') {
    Write-Host "`n[1] Starting infrastructure (Docker Compose)..." -ForegroundColor Yellow
    & docker-compose -f docker/docker-compose.yml up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to start infrastructure." -ForegroundColor Red
        exit 1
    }

    Write-Host "Infrastructure started:" -ForegroundColor Green
    Write-Host "  RabbitMQ: http://localhost:15672  (guest/guest)" -ForegroundColor Cyan
    Write-Host "  Redis:    localhost:6379" -ForegroundColor Cyan
    Write-Host "  Jaeger:   http://localhost:16686" -ForegroundColor Cyan
    Write-Host "  Prometheus: http://localhost:9090" -ForegroundColor Cyan
    Write-Host "  Grafana:  http://localhost:3001  (admin/admin)" -ForegroundColor Cyan
}

if ($Services -eq 'app' -or $Services -eq 'all') {
    Write-Host "`n[2] Running validation before startup..." -ForegroundColor Yellow
    & "$PSScriptRoot\validate.ps1" -All

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Validation failed. Aborting app startup." -ForegroundColor Red
        exit 1
    }

    Write-Host "`n[3] Starting applications..." -ForegroundColor Yellow
    Write-Host "API Gateway -> http://localhost:3000" -ForegroundColor Cyan
    & cmd /c "pnpm run start:all:dev"
}
