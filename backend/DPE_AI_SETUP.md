# DPE AI Generator - Ollama Setup Guide

## What is this?

The DPE (Diagnostic Psycho-Éducatif) generator uses **Ollama** to run a local LLM that creates professional report drafts from incident reports (signalements).

## Features

✅ **Offline AI** - No cloud APIs, all processing happens locally  
✅ **Automatic Fallback** - If Ollama is unavailable, uses template generator  
✅ **Strict JSON Output** - Enforces structured format  
✅ **No Hallucinations** - Only uses provided data, writes "Non précisé" if missing  
✅ **Professional Tone** - Suitable for psychological reports  
✅ **Metadata Tracking** - Stores which mode (AI/template) was used  

## Installation

### 1. Install Ollama

**Windows/Mac/Linux:**
```bash
# Visit: https://ollama.ai/download
# Or use winget on Windows:
winget install Ollama.Ollama
```

### 2. Pull the Model

We use **Llama 3.2 (3B)** - fast and efficient for hackathon demos:

```bash
ollama pull llama3.2:3b
```

**Alternative models:**
- `llama3.2:1b` - Faster, less accurate
- `mistral:7b` - More powerful, slower
- `qwen2.5:7b` - Multilingual, good for French

### 3. Start Ollama Service

```bash
# Ollama runs as a service on http://localhost:11434
ollama serve
```

Or just run a model (auto-starts service):
```bash
ollama run llama3.2:3b
```

### 4. Test Ollama

```bash
curl http://localhost:11434/api/tags
```

Should return a list of installed models.

## Usage

### API Endpoints

**Generate DPE Draft:**
```http
POST /api/dpe/:signalementId/generate
Authorization: Bearer <token>
```

**Get Existing Draft:**
```http
GET /api/dpe/:signalementId
Authorization: Bearer <token>
```

**Update Draft:**
```http
PUT /api/dpe/:signalementId
Authorization: Bearer <token>
Content-Type: application/json

{
  "draft": { ... }
}
```

### Test Script

```powershell
cd backend/tests
.\testDPE.ps1
```

This will:
1. Login as psychologist
2. Get a signalement
3. Generate DPE draft (with Ollama or template fallback)
4. Display the full report
5. Verify database storage

## How It Works

### 1. Try Ollama First

```javascript
const response = await ollamaClient.generate({
  model: 'llama3.2:3b',
  prompt: buildOllamaPrompt(signalementData),
  format: 'json',  // Force JSON output
  options: {
    temperature: 0.3,  // Low = consistent output
    top_p: 0.9
  }
});
```

### 2. Fallback to Template

If Ollama fails (not installed, timeout, parse error):
```javascript
// Automatic deterministic fallback
const draft = generateWithTemplate(signalementData);
// Uses urgency → risk mapping, generic recommendations
```

### 3. Validate & Store

```javascript
// Validate required fields
if (!validateDraft(draft)) {
  throw new Error('Invalid draft structure');
}

// Store in MongoDB
signalement.dpeDraft = draft;
signalement.dpeMetadata = {
  mode: 'ollama',  // or 'template'
  model: 'llama3.2:3b',
  generatedAt: new Date()
};
```

## Output Format

```json
{
  "titre": "Rapport DPE - Brouillon",
  "resume_signalement": "Summary of incident",
  "contexte": "Context including village, date, program",
  "observations": "Observations based on incident type",
  "evaluation_risque": {
    "niveau": "faible|moyen|eleve",
    "justification": "Why this risk level"
  },
  "recommandations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "plan_action": [
    {
      "action": "Action to take",
      "responsable": "Who is responsible",
      "delai": "Deadline"
    }
  ],
  "suivi": "Follow-up plan",
  "points_a_verifier": [
    "Point to verify 1",
    "Point to verify 2"
  ],
  "disclaimer": "Brouillon généré par IA — à valider par un professionnel."
}
```

## Troubleshooting

### "Ollama client not initialized"
- Ollama is not installed
- Falls back to template mode ✅

### "Ollama timeout"
- Model is taking too long (>30s)
- Falls back to template mode ✅

### "No valid JSON found in response"
- LLM output was malformed
- Falls back to template mode ✅

### Model download stuck
```bash
# Cancel and retry
ollama rm llama3.2:3b
ollama pull llama3.2:3b
```

### Service not starting
```bash
# Windows: Check if running
Get-Process ollama

# Restart service
ollama serve
```

## Performance

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| llama3.2:1b | 1.3GB | 🚀🚀🚀 | ⭐⭐ |
| llama3.2:3b | 2.0GB | 🚀🚀 | ⭐⭐⭐ (recommended) |
| mistral:7b | 4.1GB | 🚀 | ⭐⭐⭐⭐ |

**Generation time:**
- With Ollama (3B model): ~10-30 seconds
- With template fallback: <1 second

## Demo Strategy

For hackathon demos:

1. **Have Ollama ready** - Pre-pull model before demo
2. **Show both modes** - Demo AI generation, then show template fallback
3. **Emphasize reliability** - "System never fails, always generates a draft"
4. **Highlight privacy** - "All processing is local, no data leaves the server"

## Configuration

Edit [dpeController.js](../src/controllers/dpeController.js):

```javascript
const OLLAMA_MODEL = 'llama3.2:3b';  // Change model here
const OLLAMA_TIMEOUT = 30000;  // Increase if needed
const PROMPT_VERSION = 'v1.0';  // Track prompt changes
```

## Next Steps

- [ ] Fine-tune prompt for better French psychological terminology
- [ ] Add more incident type-specific templates
- [ ] Implement draft versioning (save multiple drafts)
- [ ] Add export to PDF functionality
- [ ] Integrate with workflow system (auto-generate at specific stages)

---

**Ready for production:** Yes ✅  
**Requires internet:** No ❌  
**Requires cloud API:** No ❌  
**Requires GPU:** No (CPU works fine) ❌  
**Fallback if AI fails:** Yes ✅  
