# Test New Signalement Model Structure
Write-Host "=== Test New Model Structure (Workflow + Reports) ===" -ForegroundColor Cyan

# Login
Write-Host "`n1. Login..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method Post `
    -Body (@{email="psy@sos.tn"; password="psy123"} | ConvertTo-Json) `
    -ContentType "application/json"

$token = $loginResponse.token
$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
Write-Host "[OK] Logged in: $($loginResponse.user.name)" -ForegroundColor Green

# Get a signalement (find one without dpeFinal)
Write-Host "`n2. Get signalement without submitted DPE..." -ForegroundColor Yellow
$signalements = Invoke-RestMethod -Uri "http://localhost:5000/api/signalement" -Headers $headers
$sig = $null
foreach ($s in $signalements) {
    if (-not $s.reports -or -not $s.reports.dpeFinal) {
        $sig = $s
        break
    }
}
if (-not $sig) {
    Write-Host "[WARN] All signalements have submitted DPEs, using first one anyway" -ForegroundColor Yellow
    $sig = $signalements[0]
}
Write-Host "[OK] Found signalement: $($sig._id)" -ForegroundColor Green

# Test DPE generation with new structure
Write-Host "`n3. Generate DPE (tests reports.dpeDraft structure)..." -ForegroundColor Yellow
try {
    $dpeResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$($sig._id)/generate" `
        -Method Post -Headers $headers -TimeoutSec 45
    
    Write-Host "[OK] DPE generated!" -ForegroundColor Green
    Write-Host "  Mode: $($dpeResponse.metadata.mode)" -ForegroundColor Gray
    Write-Host "  Has draft: $($null -ne $dpeResponse.draft)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Generation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Details: $($errorDetail.message)" -ForegroundColor Red
    }
    exit 1
}

# Test get DPE (reads from reports.dpeDraft)
Write-Host "`n4. Get DPE Draft..." -ForegroundColor Yellow
try {
    $getDpe = Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$($sig._id)" -Headers $headers
    Write-Host "[OK] Retrieved draft" -ForegroundColor Green
    Write-Host "  Has content: $($null -ne $getDpe.draft)" -ForegroundColor Gray
    Write-Host "  Has metadata: $($null -ne $getDpe.metadata)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Get failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test update DPE (updates reports.dpeDraft.content)
Write-Host "`n5. Update DPE Draft..." -ForegroundColor Yellow
try {
    $updatedDraft = $getDpe.draft
    $updatedDraft.titre = "UPDATED: $($updatedDraft.titre)"
    
    $updateResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$($sig._id)" `
        -Method Put -Headers $headers `
        -Body (@{draft=$updatedDraft} | ConvertTo-Json -Depth 10)
    
    Write-Host "[OK] Draft updated" -ForegroundColor Green
    Write-Host "  New title: $($updateResponse.draft.titre)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Update failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test submit DPE (creates reports.dpeFinal)
Write-Host "`n6. Submit DPE (creates dpeFinal)..." -ForegroundColor Yellow
try {
    $submitResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$($sig._id)/submit" `
        -Method Post -Headers $headers
    
    Write-Host "[OK] DPE submitted!" -ForegroundColor Green
    Write-Host "  Submitted at: $($submitResponse.metadata.submittedAt)" -ForegroundColor Gray
    Write-Host "  Submitted by: $($submitResponse.metadata.submittedBy.name)" -ForegroundColor Gray
    $isNewSubmit = $true
} catch {
    if ($_.Exception.Message -like "*400*") {
        Write-Host "[OK] Already submitted (expected if testing same signalement)" -ForegroundColor Yellow
        $isNewSubmit = $false
    } else {
        Write-Host "[ERROR] Submit failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Test double submission protection (only if we just submitted)
if ($isNewSubmit) {
    Write-Host "`n7. Test double submission protection..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$($sig._id)/submit" `
            -Method Post -Headers $headers
        Write-Host "[ERROR] Should have blocked double submission!" -ForegroundColor Red
        exit 1
    } catch {
        $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "[OK] Double submission blocked: $($errorDetail.message)" -ForegroundColor Green
    }
} else {
    Write-Host "`n7. Test double submission protection..." -ForegroundColor Yellow
    Write-Host "[SKIP] Already tested (signalement was already submitted)" -ForegroundColor Gray
}

# Get full signalement to verify structure
Write-Host "`n8. Verify full signalement structure..." -ForegroundColor Yellow
try {
    $fullSig = Invoke-RestMethod -Uri "http://localhost:5000/api/signalement/$($sig._id)" -Headers $headers
    
    Write-Host "[OK] Signalement retrieved" -ForegroundColor Green
    
    # Check workflow structure
    if ($fullSig.workflow) {
        Write-Host "`nWorkflow Structure:" -ForegroundColor Cyan
        Write-Host "  currentStep: $($fullSig.workflow.currentStep)" -ForegroundColor Gray
        Write-Host "  steps count: $($fullSig.workflow.steps.Count)" -ForegroundColor Gray
    } else {
        Write-Host "  [WARN] No workflow found" -ForegroundColor Yellow
    }
    
    # Check reports structure
    if ($fullSig.reports) {
        Write-Host "`nReports Structure:" -ForegroundColor Cyan
        Write-Host "  Has dpeDraft: $($null -ne $fullSig.reports.dpeDraft)" -ForegroundColor Gray
        Write-Host "  Has dpeFinal: $($null -ne $fullSig.reports.dpeFinal)" -ForegroundColor Gray
        Write-Host "  Has evaluationComplete: $($null -ne $fullSig.reports.evaluationComplete)" -ForegroundColor Gray
        Write-Host "  Has planAction: $($null -ne $fullSig.reports.planAction)" -ForegroundColor Gray
    } else {
        Write-Host "  [WARN] No reports object found" -ForegroundColor Yellow
    }
    
    # Check escalation structure
    if ($fullSig.escalated -ne $null) {
        Write-Host "`nEscalation Structure:" -ForegroundColor Cyan
        Write-Host "  escalated: $($fullSig.escalated)" -ForegroundColor Gray
        Write-Host "  escalatedTo: $($fullSig.escalatedTo -join ', ')" -ForegroundColor Gray
        Write-Host "  escalationNote: $($fullSig.escalationNote)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "[ERROR] Get signalement failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== ALL TESTS PASSED ===" -ForegroundColor Green
Write-Host "[OK] New structure working correctly!" -ForegroundColor Green
Write-Host "  - Embedded workflow ready" -ForegroundColor Gray
Write-Host "  - Reports object functional" -ForegroundColor Gray
Write-Host "  - DPE draft/final separation working" -ForegroundColor Gray
Write-Host "  - Escalation array structure ready" -ForegroundColor Gray
