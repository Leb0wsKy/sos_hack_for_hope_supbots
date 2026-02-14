import Signalement from '../models/Signalement.js';
import { Ollama } from 'ollama';

const PROMPT_VERSION = 'v1.0';
const OLLAMA_MODEL = 'gemma3:4b'; // Using user's installed model
const OLLAMA_TIMEOUT = 30000; // 30 seconds

// Initialize Ollama client
let ollamaClient;
try {
  ollamaClient = new Ollama({ host: 'http://localhost:11434' });
} catch (error) {
  console.warn('Ollama client initialization failed:', error.message);
}

/**
 * Generate DPE draft using Ollama or fallback to template
 */
export const generateDPEDraft = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch signalement with populated fields
    const signalement = await Signalement.findById(id)
      .populate('village', 'name location region')
      .populate('createdBy', 'name role');

    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    // Check authorization (Level 2+ only)
    if (req.user.role !== 'LEVEL2' && req.user.role !== 'LEVEL3') {
      return res.status(403).json({ 
        message: 'Access denied. Only Level 2/3 can generate DPE drafts.' 
      });
    }

    // Build structured input for AI
    const inputData = buildSignalementInput(signalement);

    let draft;
    let metadata = {
      generatedAt: new Date(),
      generatedBy: req.user.id,
      promptVersion: PROMPT_VERSION
    };

    // Try Ollama first
    try {
      draft = await generateWithOllama(inputData);
      metadata.mode = 'ollama';
      metadata.model = OLLAMA_MODEL;
    } catch (ollamaError) {
      console.warn('Ollama generation failed, using template fallback:', ollamaError.message);
      draft = generateWithTemplate(inputData);
      metadata.mode = 'template';
      metadata.model = 'template-fallback';
    }

    // Validate draft structure
    if (!validateDraft(draft)) {
      console.warn('Generated draft invalid, using template fallback');
      draft = generateWithTemplate(inputData);
      metadata.mode = 'template';
      metadata.model = 'template-fallback';
    }

    // Store draft in signalement
    if (!signalement.reports) {
      signalement.reports = {};
    }
    if (!signalement.reports.dpeDraft) {
      signalement.reports.dpeDraft = {};
    }
    signalement.reports.dpeDraft.content = draft;
    signalement.reports.dpeDraft.metadata = metadata;
    await signalement.save();

    res.json({
      success: true,
      draft,
      metadata,
      message: metadata.mode === 'ollama' 
        ? 'Brouillon généré par IA avec succès' 
        : 'Brouillon généré par modèle de secours'
    });

  } catch (error) {
    console.error('DPE generation error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du brouillon DPE', 
      error: error.message 
    });
  }
};

/**
 * Get existing DPE draft
 */
export const getDPEDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const signalement = await Signalement.findById(id)
      .populate('reports.dpeDraft.metadata.generatedBy', 'name email');

    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    if (!signalement.reports?.dpeDraft?.content) {
      return res.status(404).json({ 
        message: 'Aucun brouillon DPE disponible. Veuillez en générer un.' 
      });
    }

    res.json({
      draft: signalement.reports.dpeDraft.content,
      metadata: signalement.reports.dpeDraft.metadata
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du brouillon', 
      error: error.message 
    });
  }
};

/**
 * Update DPE draft manually (after AI generation)
 */
export const updateDPEDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { draft } = req.body;

    if (!validateDraft(draft)) {
      return res.status(400).json({ 
        message: 'Format de brouillon invalide' 
      });
    }

    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    if (!signalement.reports) signalement.reports = {};
    if (!signalement.reports.dpeDraft) signalement.reports.dpeDraft = {};
    if (!signalement.reports.dpeDraft.metadata) signalement.reports.dpeDraft.metadata = {};
    
    signalement.reports.dpeDraft.content = draft;
    signalement.reports.dpeDraft.metadata.updatedAt = new Date();
    signalement.reports.dpeDraft.metadata.updatedBy = req.user.id;
    await signalement.save();

    res.json({
      success: true,
      message: 'Brouillon DPE mis à jour',
      draft: signalement.reports.dpeDraft.content
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour', 
      error: error.message 
    });
  }
};

/**
 * Submit DPE draft (mark as final)
 */
export const submitDPEDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    if (!signalement.reports?.dpeDraft?.content) {
      return res.status(400).json({ 
        message: 'Aucun brouillon DPE à soumettre. Générez-en un d\'abord.' 
      });
    }

    if (signalement.reports?.dpeFinal?.content) {
      return res.status(400).json({ 
        message: 'Ce rapport DPE a déjà été soumis.',
        submittedAt: signalement.reports.dpeFinal.metadata.submittedAt
      });
    }

    // Copy draft to final and mark as submitted
    if (!signalement.reports) signalement.reports = {};
    if (!signalement.reports.dpeFinal) signalement.reports.dpeFinal = {};
    
    signalement.reports.dpeFinal.content = signalement.reports.dpeDraft.content;
    signalement.reports.dpeFinal.metadata = {
      submittedAt: new Date(),
      submittedBy: req.user.id
    };
    
    await signalement.save();
    await signalement.populate('reports.dpeFinal.metadata.submittedBy', 'name email');

    res.json({
      success: true,
      message: 'Rapport DPE soumis avec succès',
      draft: signalement.reports.dpeFinal.content,
      metadata: signalement.reports.dpeFinal.metadata
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la soumission', 
      error: error.message 
    });
  }
};

/**
 * Build structured input from signalement
 */
function buildSignalementInput(signalement) {
  const attachmentSummary = signalement.attachments.length > 0
    ? {
        count: signalement.attachments.length,
        types: [...new Set(signalement.attachments.map(a => a.mimeType.split('/')[0]))]
      }
    : { count: 0, types: [] };

  return {
    village: signalement.village?.name || 'Non précisé',
    region: signalement.village?.region || 'Non précisé',
    incidentType: signalement.incidentType,
    urgencyLevel: signalement.urgencyLevel,
    isAnonymous: signalement.isAnonymous,
    description: signalement.description,
    createdAt: signalement.createdAt.toLocaleDateString('fr-FR'),
    status: signalement.status,
    attachments: attachmentSummary,
    program: signalement.program || 'Non précisé'
  };
}

/**
 * Generate DPE draft using Ollama
 */
async function generateWithOllama(inputData) {
  if (!ollamaClient) {
    throw new Error('Ollama client not initialized');
  }

  const prompt = buildOllamaPrompt(inputData);

  const response = await Promise.race([
    ollamaClient.generate({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.3, // Low temperature for consistency
        top_p: 0.9
      }
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Ollama timeout')), OLLAMA_TIMEOUT)
    )
  ]);

  // Extract and parse JSON from response
  const jsonContent = extractJSON(response.response);
  const draft = JSON.parse(jsonContent);

  return draft;
}

/**
 * Build prompt for Ollama with strict JSON instructions
 */
function buildOllamaPrompt(inputData) {
  return `Tu es un assistant professionnel qui génère des brouillons de rapports DPE (Diagnostic Psycho-Éducatif) pour des signalements d'incidents dans les villages SOS d'enfants en Tunisie.

RÈGLES STRICTES:
- NE PAS inventer d'informations
- Utiliser UNIQUEMENT les données fournies
- Si une information manque, écrire "Non précisé"
- Ton neutre et professionnel
- Réponse en JSON STRICT (pas de markdown, pas d'explication)

DONNÉES DU SIGNALEMENT:
- Village: ${inputData.village}
- Région: ${inputData.region}
- Programme: ${inputData.program}
- Type d'incident: ${inputData.incidentType}
- Niveau d'urgence: ${inputData.urgencyLevel}
- Anonyme: ${inputData.isAnonymous ? 'Oui' : 'Non'}
- Date de création: ${inputData.createdAt}
- Statut: ${inputData.status}
- Description: ${inputData.description}
- Pièces jointes: ${inputData.attachments.count} fichier(s) (${inputData.attachments.types.join(', ')})

FORMAT DE SORTIE (JSON STRICT):
{
  "titre": "Rapport DPE - Brouillon",
  "resume_signalement": "Résumé court (2-3 phrases) du signalement",
  "contexte": "Contexte détaillé incluant village, programme, date",
  "observations": "Observations basées sur la description et le type d'incident",
  "evaluation_risque": {
    "niveau": "faible|moyen|eleve",
    "justification": "Justification basée sur urgencyLevel et incidentType"
  },
  "recommandations": ["Recommandation 1", "Recommandation 2", "Recommandation 3"],
  "plan_action": [
    {"action": "Action à entreprendre", "responsable": "Rôle responsable (ex: Psychologue, Educateur)", "delai": "Délai (ex: 24h, 1 semaine)"}
  ],
  "suivi": "Plan de suivi recommandé",
  "points_a_verifier": ["Point 1 à vérifier", "Point 2 à vérifier"],
  "disclaimer": "Brouillon généré par IA — à valider par un professionnel."
}

Génère maintenant le brouillon DPE en JSON:`;
}

/**
 * Extract JSON from LLM response (removes markdown, extra text)
 */
function extractJSON(text) {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Find JSON object boundaries
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start === -1 || end === -1) {
    throw new Error('No valid JSON found in response');
  }
  
  return cleaned.substring(start, end + 1);
}

/**
 * Template-based fallback generator
 */
function generateWithTemplate(inputData) {
  // Map urgency to risk level
  const riskMapping = {
    'FAIBLE': 'faible',
    'MOYEN': 'moyen',
    'ELEVE': 'eleve',
    'CRITIQUE': 'eleve'
  };

  const riskLevel = riskMapping[inputData.urgencyLevel] || 'moyen';

  // Generate summary (truncate description)
  const summary = inputData.description.length > 200
    ? inputData.description.substring(0, 197) + '...'
    : inputData.description;

  // Generic recommendations based on incident type
  const recommendations = generateRecommendations(inputData.incidentType);

  return {
    titre: "Rapport DPE - Brouillon",
    resume_signalement: summary,
    contexte: `Signalement reçu le ${inputData.createdAt} concernant le ${inputData.village}, ${inputData.region}. Programme: ${inputData.program}. Type d'incident: ${inputData.incidentType}. ${inputData.isAnonymous ? 'Signalement anonyme.' : 'Signalement identifié.'}`,
    observations: `Type d'incident: ${inputData.incidentType}. Niveau d'urgence: ${inputData.urgencyLevel}. ${inputData.attachments.count} pièce(s) jointe(s) disponible(s).`,
    evaluation_risque: {
      niveau: riskLevel,
      justification: `Évaluation basée sur le niveau d'urgence (${inputData.urgencyLevel}) et le type d'incident (${inputData.incidentType}).`
    },
    recommandations: recommendations,
    plan_action: [
      {
        action: "Évaluation complète par le psychologue",
        responsable: "Psychologue",
        delai: "48 heures"
      },
      {
        action: "Entretien avec les parties concernées",
        responsable: "Educateur/Psychologue",
        delai: "1 semaine"
      },
      {
        action: "Rapport détaillé et plan d'intervention",
        responsable: "Psychologue",
        delai: "2 semaines"
      }
    ],
    suivi: "Suivi hebdomadaire pendant le premier mois, puis mensuel selon l'évolution de la situation.",
    points_a_verifier: [
      "Vérifier les antécédents similaires",
      "Consulter l'équipe éducative",
      "Évaluer l'environnement familial",
      "Documenter tous les échanges"
    ],
    disclaimer: "Brouillon généré par IA — à valider par un professionnel."
  };
}

/**
 * Generate recommendations based on incident type
 */
function generateRecommendations(incidentType) {
  const recommendationsMap = {
    'SANTE': [
      'Consultation médicale immédiate si nécessaire',
      'Suivi médical régulier',
      'Coordination avec le personnel soignant'
    ],
    'VIOLENCE_PHYSIQUE': [
      'Assurer la sécurité immédiate de l\'enfant',
      'Signalement aux autorités compétentes',
      'Accompagnement psychologique',
      'Évaluation des mesures de protection'
    ],
    'VIOLENCE_PSYCHOLOGIQUE': [
      'Accompagnement psychologique',
      'Renforcement du soutien éducatif',
      'Travail sur l\'estime de soi'
    ],
    'VIOLENCE_SEXUELLE': [
      'Protection immédiate de l\'enfant',
      'Signalement obligatoire aux autorités',
      'Accompagnement psychologique spécialisé',
      'Suivi médical'
    ],
    'NEGLIGENCE': [
      'Évaluation des besoins de l\'enfant',
      'Renforcement de l\'encadrement',
      'Formation du personnel éducatif'
    ],
    'COMPORTEMENT': [
      'Évaluation comportementale approfondie',
      'Mise en place d\'un plan d\'intervention',
      'Travail avec l\'équipe éducative'
    ],
    'EDUCATION': [
      'Évaluation des besoins éducatifs',
      'Soutien scolaire adapté',
      'Coordination avec les établissements scolaires'
    ],
    'FAMILIAL': [
      'Médiation familiale si appropriée',
      'Accompagnement psychosocial',
      'Évaluation de la dynamique familiale'
    ],
    'AUTRE': [
      'Évaluation complète de la situation',
      'Consultation d\'experts si nécessaire',
      'Plan d\'action adapté'
    ]
  };

  return recommendationsMap[incidentType] || recommendationsMap['AUTRE'];
}

/**
 * Validate DPE draft structure
 */
function validateDraft(draft) {
  if (!draft || typeof draft !== 'object') return false;

  const requiredFields = [
    'titre',
    'resume_signalement',
    'contexte',
    'observations',
    'evaluation_risque',
    'recommandations',
    'plan_action',
    'suivi',
    'points_a_verifier',
    'disclaimer'
  ];

  for (const field of requiredFields) {
    if (!(field in draft)) return false;
  }

  // Validate risk evaluation
  if (!draft.evaluation_risque.niveau || !draft.evaluation_risque.justification) {
    return false;
  }

  if (!['faible', 'moyen', 'eleve'].includes(draft.evaluation_risque.niveau)) {
    return false;
  }

  // Validate arrays
  if (!Array.isArray(draft.recommandations) || !Array.isArray(draft.plan_action) || !Array.isArray(draft.points_a_verifier)) {
    return false;
  }

  return true;
}
