# Comprehensive DPE Workflow Test - Generate, Edit, Submit
Write-Host "=== Test complet workflow DPE ===" -ForegroundColor Cyan

# Login as psychologist
Write-Host "`n1. Connexion psychologue..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method Post `
    -Body (@{email="psy@sos.tn"; password="psy123"} | ConvertTo-Json) `
    -ContentType "application/json"

$token = $loginResponse.token
$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
Write-Host "[OK] $($loginResponse.user.name)" -ForegroundColor Green

# Get all signalements
Write-Host "`n2. Liste des signalements disponibles..." -ForegroundColor Yellow
$signalements = Invoke-RestMethod -Uri "http://localhost:5000/api/signalement" -Headers $headers

if ($signalements.Count -eq 0) {
    Write-Host "[ERROR] Aucun signalement. Lancez: node createTestSignalements.js" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] $($signalements.Count) signalement(s) trouve(s)" -ForegroundColor Green
Write-Host "`nSignalements disponibles:" -ForegroundColor Cyan
$i = 1
$signalements | ForEach-Object {
    Write-Host "  $i. $($_.title)" -ForegroundColor Gray
    Write-Host "     Type: $($_.incidentType), Urgence: $($_.urgencyLevel)" -ForegroundColor DarkGray
    $i++
}

# Select first signalement for full workflow
$selectedSig = $signalements[0]
$sigId = $selectedSig._id

Write-Host "`n3. Test avec: $($selectedSig.title)" -ForegroundColor Yellow
Write-Host "   Village: $($selectedSig.village.name)" -ForegroundColor Gray
Write-Host "   Type: $($selectedSig.incidentType)" -ForegroundColor Gray
Write-Host "   Urgence: $($selectedSig.urgencyLevel)" -ForegroundColor Gray

# Generate DPE draft with AI
Write-Host "`n4. Generation du brouillon DPE avec AI..." -ForegroundColor Yellow
$generateResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$sigId/generate" `
    -Method Post -Headers $headers

Write-Host "[OK] Genere! Mode: $($generateResponse.metadata.mode), Modele: $($generateResponse.metadata.model)" -ForegroundColor Green

$draft = $generateResponse.draft
Write-Host "`nBrouillon genere:" -ForegroundColor Cyan
Write-Host "  Titre: $($draft.titre)" -ForegroundColor Gray
Write-Host "  Risque: $($draft.evaluation_risque.niveau)" -ForegroundColor Gray
Write-Host "  Recommandations: $($draft.recommandations.Count)" -ForegroundColor Gray
Write-Host "  Actions: $($draft.plan_action.Count)" -ForegroundColor Gray

# Edit the draft (psychologist makes changes)
Write-Host "`n5. Modification du brouillon par le psychologue..." -ForegroundColor Yellow

# Make some edits to the draft
$draft.resume_signalement = "$($draft.resume_signalement) [MODIFIE PAR PSYCHOLOGUE: Ajout contexte familial]"
$draft.recommandations += "Organiser une reunion de suivi avec l'equipe educative"
$draft.evaluation_risque.justification = "$($draft.evaluation_risque.justification) Note psychologue: Surveillance renforcee necessaire."

$updateBody = @{ draft = $draft } | ConvertTo-Json -Depth 10

$updateResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$sigId" `
    -Method Put -Headers $headers -Body $updateBody

Write-Host "[OK] $($updateResponse.message)" -ForegroundColor Green
Write-Host "  Nouvelles recommandations: $($updateResponse.draft.recommandations.Count)" -ForegroundColor Gray

# Submit the final report
Write-Host "`n6. Soumission du rapport final..." -ForegroundColor Yellow
$submitResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$sigId/submit" `
    -Method Post -Headers $headers

Write-Host "[OK] $($submitResponse.message)" -ForegroundColor Green
Write-Host "  Statut: $($submitResponse.metadata.status)" -ForegroundColor Gray
Write-Host "  Soumis le: $($submitResponse.metadata.submittedAt)" -ForegroundColor Gray
Write-Host "  Soumis par: $($submitResponse.metadata.submittedBy.name)" -ForegroundColor Gray

# Try to submit again (should fail)
Write-Host "`n7. Test: Tentative de re-soumission (devrait echouer)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$sigId/submit" `
        -Method Post -Headers $headers
    Write-Host "[ERROR] La re-soumission aurait du echouer!" -ForegroundColor Red
} catch {
    $error = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "[OK] Re-soumission bloquee: $($error.message)" -ForegroundColor Green
}

# Display final report
Write-Host "`n=== RAPPORT DPE FINAL ===" -ForegroundColor Cyan
$finalDraft = $submitResponse.draft
Write-Host "`n$($finalDraft.titre)" -ForegroundColor White
Write-Host "`nResume:" -ForegroundColor Yellow
Write-Host $finalDraft.resume_signalement -ForegroundColor Gray
Write-Host "`nEvaluation Risque: $($finalDraft.evaluation_risque.niveau.ToUpper())" -ForegroundColor Yellow
Write-Host $finalDraft.evaluation_risque.justification -ForegroundColor Gray
Write-Host "`nRecommandations ($($finalDraft.recommandations.Count)):" -ForegroundColor Yellow
$finalDraft.recommandations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
Write-Host "`nPlan Action:" -ForegroundColor Yellow
$finalDraft.plan_action | ForEach-Object {
    Write-Host "  - $($_.action)" -ForegroundColor Gray
    Write-Host "    ($($_.responsable), $($_.delai))" -ForegroundColor DarkGray
}

Write-Host "`n=== TEST REUSSI ===" -ForegroundColor Green
Write-Host "[OK] Generation AI" -ForegroundColor Green
Write-Host "[OK] Modification par psychologue" -ForegroundColor Green
Write-Host "[OK] Soumission finale" -ForegroundColor Green
Write-Host "[OK] Protection contre re-soumission" -ForegroundColor Green

# Test with more signalements
Write-Host "`n8. Test rapide avec les autres signalements..." -ForegroundColor Yellow
$testedCount = 1
for ($j = 1; $j -lt [Math]::Min(3, $signalements.Count); $j++) {
    $testSig = $signalements[$j]
    Write-Host "`n  Test $($j+1): $($testSig.title.Substring(0, [Math]::Min(50, $testSig.title.Length)))..." -ForegroundColor Gray
    
    try {
        $testGen = Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$($testSig._id)/generate" `
            -Method Post -Headers $headers
        Write-Host "  [OK] Genere en mode $($testGen.metadata.mode)" -ForegroundColor Green
        $testedCount++
    } catch {
        Write-Host "  [WARN] Erreur: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== BILAN FINAL ===" -ForegroundColor Cyan
Write-Host "Total signalements testes: $testedCount" -ForegroundColor Green
Write-Host "Workflow complet valide: Generation → Edition → Soumission" -ForegroundColor Green
