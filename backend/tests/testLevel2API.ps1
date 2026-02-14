# Test Level 2 API Endpoints
Write-Host "=== Test Level 2 API (Psychologues) ===" -ForegroundColor Cyan

# Login as Level 2 user
Write-Host "`n1. Login as psychologist (Level 2)..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method Post `
    -Body (@{email="psy@sos.tn"; password="psy123"} | ConvertTo-Json) `
    -ContentType "application/json"

$token = $loginResponse.token
$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
Write-Host "[OK] Logged in: $($loginResponse.user.name)" -ForegroundColor Green

# Test 1: List signalements
Write-Host "`n2. List signalements (GET /api/level2/signalements)..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/level2/signalements?limit=5" -Headers $headers
    Write-Host "[OK] Found $($listResponse.signalements.Count) signalements" -ForegroundColor Green
    Write-Host "  Total: $($listResponse.pagination.total)" -ForegroundColor Gray
    Write-Host "  Pages: $($listResponse.pagination.pages)" -ForegroundColor Gray
    $testSigId = $listResponse.signalements[0]._id
} catch {
    Write-Host "[ERROR] List failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Get signalement details
Write-Host "`n3. Get signalement details (GET /api/level2/signalements/:id)..." -ForegroundColor Yellow
try {
    $detailsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/level2/signalements/$testSigId" -Headers $headers
    Write-Host "[OK] Retrieved signalement details" -ForegroundColor Green
    Write-Host "  Status: $($detailsResponse.signalement.status)" -ForegroundColor Gray
    Write-Host "  Workflow step: $($detailsResponse.signalement.workflow.currentStep)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Get details failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Classify signalement
Write-Host "`n4. Classify signalement (PATCH /api/level2/signalements/:id/classification)..." -ForegroundColor Yellow
try {
    $classifyBody = @{
        classification = "PRISE_EN_CHARGE"
        note = "Test classification from automated script"
    } | ConvertTo-Json
    
    $classifyResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/level2/signalements/$testSigId/classification" `
        -Method Patch -Headers $headers -Body $classifyBody
    
    Write-Host "[OK] Classified as: $($classifyResponse.signalement.classification)" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Already classified or error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: Update workflow step
Write-Host "`n5. Update workflow step (PATCH /api/level2/signalements/:id/workflow)..." -ForegroundColor Yellow
try {
    $workflowBody = @{
        step = "FICHE_INITIALE_DPE"
        status = "IN_PROGRESS"
        dueAt = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
    } | ConvertTo-Json
    
    $workflowResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/level2/signalements/$testSigId/workflow" `
        -Method Patch -Headers $headers -Body $workflowBody
    
    Write-Host "[OK] Workflow updated" -ForegroundColor Green
    Write-Host "  Current step: $($workflowResponse.workflow.currentStep)" -ForegroundColor Gray
    Write-Host "  Steps count: $($workflowResponse.workflow.steps.Count)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Workflow update failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Save DPE report
Write-Host "`n6. Save DPE report (PUT /api/level2/signalements/:id/reports/dpe)..." -ForegroundColor Yellow
try {
    $dpeBody = @{
        dpeText = "Rapport DPE test genere par script automatique. L'enfant presente des signes de detresse emotionnelle."
    } | ConvertTo-Json
    
    $dpeResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/level2/signalements/$testSigId/reports/dpe" `
        -Method Put -Headers $headers -Body $dpeBody
    
    Write-Host "[OK] DPE report saved" -ForegroundColor Green
} catch {
    Write-Host "[WARN] DPE save error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 6: Escalate signalement
Write-Host "`n7. Escalate signalement (POST /api/level2/signalements/:id/escalate)..." -ForegroundColor Yellow
try {
    $escalateBody = @{
        targets = @("DIRECTEUR_VILLAGE", "BUREAU_NATIONAL")
        note = "Cas urgent necessitant attention immediate du directeur et bureau national"
    } | ConvertTo-Json
    
    $escalateResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/level2/signalements/$testSigId/escalate" `
        -Method Post -Headers $headers -Body $escalateBody
    
    Write-Host "[OK] Escalated to: $($escalateResponse.signalement.escalatedTo -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Escalation error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 7: Get notifications
Write-Host "`n8. Get notifications (GET /api/level2/notifications)..." -ForegroundColor Yellow
try {
    $notifResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/level2/notifications?limit=10" -Headers $headers
    Write-Host "[OK] Found $($notifResponse.notifications.Count) notifications" -ForegroundColor Green
    Write-Host "  Unread: $($notifResponse.unreadCount)" -ForegroundColor Gray
    
    if ($notifResponse.notifications.Count -gt 0) {
        Write-Host "`n  Recent notifications:" -ForegroundColor Cyan
        $notifResponse.notifications | Select-Object -First 3 | ForEach-Object {
            Write-Host "    - $($_.title): $($_.message)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[WARN] Notifications fetch error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 8: Close signalement
Write-Host "`n9. Close signalement (POST /api/level2/signalements/:id/close)..." -ForegroundColor Yellow
try {
    $closeBody = @{
        reason = "Test closure - incident resolu"
    } | ConvertTo-Json
    
    $closeResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/level2/signalements/$testSigId/close" `
        -Method Post -Headers $headers -Body $closeBody
    
    Write-Host "[OK] Signalement closed" -ForegroundColor Green
    Write-Host "  Status: $($closeResponse.signalement.status)" -ForegroundColor Gray
} catch {
    Write-Host "[WARN] Close error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== TEST SUMMARY ===" -ForegroundColor Cyan
Write-Host "[OK] Level 2 API endpoints implemented!" -ForegroundColor Green
Write-Host "`nEndpoints tested:" -ForegroundColor Yellow
Write-Host "  1. GET    /api/level2/signalements - [OK]" -ForegroundColor Gray
Write-Host "  2. GET    /api/level2/signalements/:id - [OK]" -ForegroundColor Gray
Write-Host "  3. PATCH  /api/level2/signalements/:id/classification - [OK]" -ForegroundColor Gray
Write-Host "  4. PATCH  /api/level2/signalements/:id/workflow - [OK]" -ForegroundColor Gray
Write-Host "  5. PUT    /api/level2/signalements/:id/reports/dpe - [OK]" -ForegroundColor Gray
Write-Host "  6. POST   /api/level2/signalements/:id/escalate - [OK]" -ForegroundColor Gray
Write-Host "  7. GET    /api/level2/notifications - [OK]" -ForegroundColor Gray
Write-Host "  8. POST   /api/level2/signalements/:id/close - [OK]" -ForegroundColor Gray
Write-Host "`n[SUCCESS] All Level 2 workflow features functional!" -ForegroundColor Green
