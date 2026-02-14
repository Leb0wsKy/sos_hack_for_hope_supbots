# Test DPE Draft Generation with AI
Write-Host "=== Test generation brouillon DPE ===" -ForegroundColor Cyan

# Login as psychologist
Write-Host "`n1. Connexion psychologue..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method Post `
    -Body (@{email="psy@sos.tn"; password="psy123"} | ConvertTo-Json) `
    -ContentType "application/json"

$token = $loginResponse.token
$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
Write-Host "[OK] Connecte: $($loginResponse.user.name)" -ForegroundColor Green

# Get a signalement
Write-Host "`n2. Recuperation signalement..." -ForegroundColor Yellow
$signalements = Invoke-RestMethod -Uri "http://localhost:5000/api/signalement" -Headers $headers

if ($signalements.Count -eq 0) {
    Write-Host "[ERROR] Aucun signalement. Utilisez testUpload.ps1 d'abord." -ForegroundColor Red
    exit 1
}

$sig = $signalements[0]
Write-Host "[OK] Signalement: $($sig.title)" -ForegroundColor Green
Write-Host "  Urgence: $($sig.urgencyLevel), Type: $($sig.incidentType)" -ForegroundColor Gray

# Generate DPE draft
Write-Host "`n3. Generation DPE (peut prendre 10-30s avec Ollama)..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/dpe/$($sig._id)/generate" `
        -Method Post -Headers $headers

    Write-Host "[OK] $($result.message)" -ForegroundColor Green
    Write-Host "  Mode: $($result.metadata.mode)" -ForegroundColor Gray
    Write-Host "  Modele: $($result.metadata.model)" -ForegroundColor Gray

    $d = $result.draft
    Write-Host "`n--- BROUILLON DPE ---" -ForegroundColor Cyan
    Write-Host "Titre: $($d.titre)" -ForegroundColor White
    Write-Host "`nResume:" -ForegroundColor Yellow
    Write-Host $d.resume_signalement -ForegroundColor Gray
    Write-Host "`nRisque: $($d.evaluation_risque.niveau.ToUpper())" -ForegroundColor Yellow
    Write-Host $d.evaluation_risque.justification -ForegroundColor Gray
    Write-Host "`nRecommandations:" -ForegroundColor Yellow
    $d.recommandations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    Write-Host "`nPlan action:" -ForegroundColor Yellow
    $d.plan_action | ForEach-Object { Write-Host "  - $($_.action) ($($_.responsable), $($_.delai))" -ForegroundColor Gray }
    Write-Host "`n$($d.disclaimer)" -ForegroundColor DarkYellow

    Write-Host "`n=== TEST REUSSI ===" -ForegroundColor Green
    if ($result.metadata.mode -eq 'template') {
        Write-Host "[INFO] Mode template utilise. Pour Ollama:" -ForegroundColor Yellow
        Write-Host "  1. Installez Ollama: https://ollama.ai" -ForegroundColor Gray
        Write-Host "  2. ollama run llama3.2:3b" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
    exit 1
}
