# Kill process on port 5000
Write-Host "Stopping process on port 5000..." -ForegroundColor Yellow
$conn = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($conn) {
    $processId = $conn.OwningProcess
    Write-Host "Found PID: $processId" -ForegroundColor Gray
    taskkill /F /PID $processId 2>&1 | Out-Null
    Start-Sleep -Seconds 2
}

# Start server
Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location $PSScriptRoot
node src/server.js
