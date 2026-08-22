Write-Host ""
Write-Host "  ██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗██████╗ ███████╗███████╗██╗  ██╗" -ForegroundColor Blue
Write-Host "  ██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝██╔══██╗██╔════╝██╔════╝██║ ██╔╝" -ForegroundColor Blue
Write-Host "  ██║ █╗ ██║██║   ██║██████╔╝█████╔╝ ██║  ██║█████╗  ███████╗█████╔╝ " -ForegroundColor Blue
Write-Host "  ██║███╗██║██║   ██║██╔══██╗██╔═██╗ ██║  ██║██╔══╝  ╚════██║██╔═██╗ " -ForegroundColor Blue
Write-Host "  ╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗██████╔╝███████╗███████║██║  ██╗" -ForegroundColor Blue
Write-Host "   ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝" -ForegroundColor Blue
Write-Host ""
Write-Host "  WorkDesk HRMS — Docker Launcher" -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

Write-Host "  [1/2] Building and starting services..." -ForegroundColor Yellow
Write-Host ""

docker-compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  X  Build failed. Check errors above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  [2/2] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  All services are up!" -ForegroundColor Green
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   Frontend App   ->  http://localhost" -ForegroundColor Cyan
Write-Host "   API Docs       ->  http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  NOTE: First time? Click 'Register Company' on the login page." -ForegroundColor Yellow
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# Open links in browser
Start-Process "http://localhost"
Start-Process "http://localhost:8000/api/docs"
