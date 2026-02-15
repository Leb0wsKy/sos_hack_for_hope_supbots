import { useState, useEffect, useCallback } from 'react';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel, ShadingType,
} from 'docx';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Search,
  ArrowUpRight,
  Download,
  FileText,
  Eye,
  UserPlus,
  Loader2,
  X,
  ClipboardList,
  Activity,
  Shield,
  History,
} from 'lucide-react';
import {
  getSignalements,
  sauvegarderSignalement,
  markSignalementFaux,
  predictFalseAlarm,
  downloadAttachment,
  createWorkflow,
  getWorkflow,
  updateWorkflowStage,
  classifySignalement as classifyAPI,
  downloadTemplate,
  generateDPE,
  getDPEDraft,
  markDpeGenerated,
  closeWorkflow,
} from '../services/api';
import BackgroundPattern from '../components/BackgroundPattern';
import { Toast, useToast } from '../components/Toast';
import ConfirmModal, { useConfirm } from '../components/ConfirmModal';
import HistoryPanel from '../components/HistoryPanel';

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */

const URGENCY = {
  FAIBLE: { label: 'Faible', bg: 'bg-sos-green-light', text: 'text-sos-green', dot: 'bg-sos-green' },
  MOYEN: { label: 'Moyen', bg: 'bg-sos-blue-lighter', text: 'text-sos-blue', dot: 'bg-sos-blue' },
  ELEVE: { label: 'Élevé', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  CRITIQUE: { label: 'Critique', bg: 'bg-sos-red-light', text: 'text-sos-red', dot: 'bg-sos-red' },
};

const STATUS_MAP = {
  EN_ATTENTE: { label: 'En attente', color: 'text-sos-blue', icon: Clock },
  EN_COURS: { label: 'En cours', color: 'text-sos-blue', icon: Activity },
  CLOTURE: { label: 'Clôturé', color: 'text-sos-green', icon: CheckCircle2 },
  FAUX_SIGNALEMENT: { label: 'Faux signalement', color: 'text-sos-gray-400', icon: X },
};

const KANBAN_COLUMNS = [
  { key: 'EN_ATTENTE', label: 'En attente', accent: 'border-sos-blue', iconBg: 'bg-sos-blue-lighter', iconColor: 'text-sos-blue' },
  { key: 'EN_COURS', label: 'En cours de traitement', accent: 'border-sos-blue', iconBg: 'bg-sos-blue-light', iconColor: 'text-sos-blue' },
  { key: 'CLOTURE', label: 'Clôturés', accent: 'border-sos-green', iconBg: 'bg-sos-green-light', iconColor: 'text-sos-green' },
];


const CLASSIFICATION_OPTIONS = [
  { value: 'SAUVEGARDE', label: 'Sauvegarde', color: 'bg-sos-red-light text-sos-red' },
  { value: 'PRISE_EN_CHARGE', label: 'Prise en charge', color: 'bg-sos-blue-light text-sos-blue' },
  { value: 'FAUX_SIGNALEMENT', label: 'Faux signalement', color: 'bg-sos-gray-100 text-sos-gray-600' },
];

/**
 * Six-stage document workflow matching backend model:
 *  1. ficheInitiale       — Fiche Initiale           — 24h
 *  2. rapportDpe          — Rapport DPE (IA)         — AI-generated
 *  3. evaluationComplete  — Évaluation Complète      — 48h
 *  4. planAction          — Plan d'Action            — 48h
 *  5. rapportSuivi        — Rapport de Suivi         — 72h
 *  6. rapportFinal        — Rapport Final            — 48h
 */
const STAGE_ORDER = [
  { key: 'ficheInitiale',      enum: 'FICHE_INITIALE',      label: 'Fiche Initiale',       template: 'fiche-initiale',      isDpe: false },
  { key: 'rapportDpe',         enum: 'RAPPORT_DPE',         label: 'Rapport DPE (IA)',     template: 'rapport-dpe',         isDpe: true },
  { key: 'evaluationComplete', enum: 'EVALUATION_COMPLETE', label: 'Évaluation Complète',  template: 'evaluation-complete', isDpe: false },
  { key: 'planAction',         enum: 'PLAN_ACTION',         label: 'Plan d\'Action',        template: 'plan-action',         isDpe: false },
  { key: 'rapportSuivi',       enum: 'RAPPORT_SUIVI',       label: 'Rapport de Suivi',     template: 'rapport-suivi',       isDpe: false },
  { key: 'rapportFinal',       enum: 'RAPPORT_FINAL',       label: 'Rapport Final',        template: 'rapport-final',       isDpe: false },
];

/** Returns the next uncompleted stage, or null if all done. */
const getNextStage = (workflow) => {
  if (!workflow?.stages) return null;
  for (const s of STAGE_ORDER) {
    if (!workflow.stages[s.key]?.completed) return s;
  }
  return null;
};

/** Returns how many stages are completed. */
const completedStageCount = (workflow) => {
  if (!workflow?.stages) return 0;
  return STAGE_ORDER.filter((s) => workflow.stages[s.key]?.completed).length;
};

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
};

/** Calculate countdown from deadline */
const getCountdown = (deadlineAt) => {
  if (!deadlineAt) return null;
  
  const now = Date.now();
  const deadline = new Date(deadlineAt).getTime();
  const timeLeft = deadline - now;
  
  if (timeLeft <= 0) {
    return { expired: true, message: 'Délai expiré!', color: 'text-sos-red', bg: 'bg-sos-red-light' };
  }
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours <= 0 && minutes <= 30) {
    return { 
      expired: false, 
      critical: true,
      message: `${minutes}m restantes`, 
      color: 'text-sos-red', 
      bg: 'bg-sos-red-light',
      hours,
      minutes 
    };
  } else if (hours <= 2) {
    return { 
      expired: false, 
      warning: true,
      message: `${hours}h ${minutes}m restantes`, 
      color: 'text-sos-blue', 
      bg: 'bg-sos-blue-lighter',
      hours,
      minutes 
    };
  } else {
    return { 
      expired: false, 
      message: `${hours}h ${minutes}m restantes`, 
      color: 'text-sos-blue', 
      bg: 'bg-sos-blue-light',
      hours,
      minutes 
    };
  }
};

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

/* ── Urgency Badge ── */
const UrgencyBadge = ({ level }) => {
  const u = URGENCY[level] || URGENCY.MOYEN;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.bg} ${u.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
      {u.label}
    </span>
  );
};

/* ── Notification Bell ── */
const NotificationBell = ({ items, onClickItem }) => {
  const [open, setOpen] = useState(false);
  const urgent = items.filter((s) => s.urgencyLevel === 'CRITIQUE' || s.urgencyLevel === 'ELEVE');

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer"
      >
        <Bell className="w-5 h-5 text-sos-gray-600" />
        {urgent.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-sos-red text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-dot">
            {urgent.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-sos-gray-200 z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-sos-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-sos-gray-800">Notifications</h3>
            <span className="text-xs text-sos-gray-400">{urgent.length} urgent{urgent.length !== 1 && 's'}</span>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {urgent.length === 0 && (
              <p className="p-4 text-sm text-sos-gray-400 text-center">Aucune alerte urgente</p>
            )}
            {urgent.map((s) => (
              <button
                key={s._id}
                onClick={() => { onClickItem(s); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-sos-gray-50 transition border-b border-sos-gray-50 last:border-0 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-sos-red shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sos-gray-800 truncate">
                      {s.title || s.incidentType || 'Signalement'}
                    </p>
                    <p className="text-xs text-sos-gray-500 mt-0.5">
                      {s.village?.name || 'Village inconnu'} · {timeAgo(s.createdAt)}
                    </p>
                  </div>
                  <UrgencyBadge level={s.urgencyLevel} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Signalement Card (Kanban item) ── */
const SignalementCard = ({ item, onSelect }) => {
  const st = STATUS_MAP[item.status] || STATUS_MAP.EN_ATTENTE;
  const StIcon = st.icon;
  const countdown = getCountdown(item.deadlineAt);

  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left bg-white border border-sos-gray-200 rounded-xl p-4 hover:shadow-card-hover
                 transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <UrgencyBadge level={item.urgencyLevel} />
        <span className="text-xs text-sos-gray-400">{timeAgo(item.createdAt)}</span>
      </div>
      
      {/* Countdown banner for sauvegarded items */}
      {countdown && item.status !== 'CLOTURE' && item.status !== 'FAUX_SIGNALEMENT' && (
        <div className={`${countdown.bg} border border-current rounded-lg px-2 py-1 mb-2`}>
          <div className={`text-xs font-semibold ${countdown.color} flex items-center gap-1`}>
            <Clock className="w-3 h-3" />
            {countdown.message}
          </div>
        </div>
      )}
      
      <h4 className="text-sm font-semibold text-sos-gray-800 mb-1 truncate">
        {item.title || item.incidentType || 'Signalement'}
      </h4>
      <p className="text-xs text-sos-gray-500 line-clamp-2 mb-3">
        {item.description?.substring(0, 120)}
      </p>
      <div className="flex items-center justify-between text-xs text-sos-gray-400">
        <span className="flex items-center gap-1">
          <StIcon className="w-3.5 h-3.5" />
          {st.label}
        </span>
        <span>{item.village?.name || ''}</span>
      </div>
      {/* Workflow stage indicator */}
      {(() => {
        const wfData = item.workflowRef || item.workflow;
        if (wfData && typeof wfData === 'object' && wfData.currentStage) {
          const stageDef = STAGE_ORDER.find((s) => s.enum === wfData.currentStage);
          return (
            <div className="mt-2 pt-2 border-t border-sos-gray-100 flex items-center gap-1.5 text-xs text-sos-blue">
              <ClipboardList className="w-3.5 h-3.5" />
              {wfData.status === 'COMPLETED' ? 'Workflow terminé' : stageDef ? stageDef.label : wfData.currentStage}
            </div>
          );
        }
        return null;
      })()}
      {/* Arrow on hover */}
      <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="w-4 h-4 text-sos-blue" />
      </div>
    </button>
  );
};

/* ── ML Prediction Modal ── */
const MLPredictionModal = ({ prediction, onConfirm, onCancel }) => {
  if (!prediction) return null;

  const hasError = prediction.error;
  const isFalseAlarm = prediction.is_false_alarm;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-2xl w-[400px]" onClick={(e) => e.stopPropagation()}>
        {/* Content */}
        <div className="p-8 text-center">
          {hasError ? (
            <p className="text-lg font-bold text-gray-700">Service IA indisponible</p>
          ) : (
            <h3 className={`text-2xl font-bold ${
              isFalseAlarm ? 'text-red-600' : 'text-green-600'
            }`}>
              {isFalseAlarm ? 'Fausse Alarme' : 'Signalement Authentique'}
            </h3>
          )}
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Retour
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-lg"
          >
            Déclarer fausse alarme
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Detail Drawer ── */
const DetailDrawer = ({ item, onClose, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState('');
  const [stageContent, setStageContent] = useState('');
  const [stageFiles, setStageFiles] = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [loadingWf, setLoadingWf] = useState(false);
  const [dpeResult, setDpeResult] = useState(null);
  const [showFullDpe, setShowFullDpe] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const [toast, showToast, dismissToast] = useToast();
  const [confirmProps, showConfirm] = useConfirm();
  const [mlPrediction, setMlPrediction] = useState(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);

  // Fetch the real Workflow document from the backend
  const fetchWorkflow = useCallback(async () => {
    if (!item?._id) return;
    setLoadingWf(true);
    try {
      const { data } = await getWorkflow(item._id);
      setWorkflow(data);
    } catch {
      setWorkflow(null);
    }
    setLoadingWf(false);
  }, [item?._id]);

  // Fetch workflow on mount / item change
  useEffect(() => {
    if (item && (item.status === 'EN_COURS' || item.workflowRef || item.workflow)) {
      fetchWorkflow();
    } else {
      setWorkflow(null);
    }
  }, [item?._id, fetchWorkflow]);

  // Auto-fetch existing DPE draft if already generated
  useEffect(() => {
    if (workflow?.dpeGenerated && item?._id && !dpeResult) {
      getDPEDraft(item._id)
        .then(({ data }) => setDpeResult({ draft: data.draft, metadata: data.metadata }))
        .catch(() => {});
    }
  }, [workflow?.dpeGenerated, item?._id]);

  if (!item) return null;

  const alreadySauvegarded = !!item.sauvegardedAt;

  const wf = workflow;
  const nextStage = wf ? getNextStage(wf) : null;

  const handleSauvegarder = async () => {
    setActionLoading('sauv');
    try {
      console.log('Attempting to sauvegarde signalement:', item._id);
      console.log('API URL:', `/signalements/${item._id}/sauvegarder`);
      console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const response = await sauvegarderSignalement(item._id);
      console.log('Sauvegarde successful:', response.data);
      
      // Show success message
      if (response.data.deadlineAt) {
        const deadline = new Date(response.data.deadlineAt);
        showToast('success', `Délai: ${deadline.toLocaleString('fr-FR')} — Vous avez 24h pour traiter ce signalement.`, 'Signalement sauvegardé', 5000);
      } else {
        showToast('success', 'Signalement sauvegardé avec succès.');
      }
      
      onRefresh();
    } catch (error) {
      console.error('Sauvegarde failed:', error);
      
      if (error.response) {
        console.log('Error status:', error.response.status);
        console.log('Error data:', error.response.data);
        
        if (error.response.status === 403) {
          showToast('error', 'Ce signalement est déjà pris en charge par un autre utilisateur.');
        } else if (error.response.status === 400) {
          showToast('warning', 'Vous avez déjà sauvegardé ce signalement.');
        } else if (error.response.status === 401) {
          showToast('error', 'Vous n\'êtes pas authentifié. Veuillez vous reconnecter.');
        } else {
          showToast('error', error.response.data.message || 'Erreur inconnue');
        }
      } else if (error.request) {
        console.log('No response received:', error.request);
        showToast('error', 'Impossible de contacter le serveur.');
      } else {
        console.log('Request setup error:', error.message);
        showToast('error', error.message);
      }
    }
    setActionLoading('');
  };

  const handleCreateWorkflow = async () => {
    setActionLoading('wf');
    try {
      await createWorkflow(item._id);
      await fetchWorkflow();
      onRefresh();
    } catch (error) {
      console.error('Create workflow failed:', error);
      showToast('error', error.response?.data?.message || 'Erreur lors de la création du workflow');
    }
    setActionLoading('');
  };

  const handleClassify = async (classification) => {
    if (!wf?._id) return;

    // Confirmation for destructive actions
    if (classification === 'FAUX_SIGNALEMENT') {
      const ok = await showConfirm({ title: 'Marquer comme faux', message: 'Êtes-vous sûr de marquer ce signalement comme FAUX ? Cette action est irréversible.', danger: true, confirmText: 'Marquer comme faux' });
      if (!ok) return;
    }
    if (classification === 'PRISE_EN_CHARGE') {
      const ok = await showConfirm({ title: 'Prise en charge simple', message: 'Ce signalement sera traité comme une prise en charge simple (sans workflow complet).', confirmText: 'Confirmer' });
      if (!ok) return;
    }

    setActionLoading('cls');
    try {
      await classifyAPI(wf._id, classification);
      if (classification === 'SAUVEGARDE') {
        showToast('success', 'Le workflow 6 étapes est maintenant actif.', 'Classification : Sauvegarde');
      } else if (classification === 'PRISE_EN_CHARGE') {
        showToast('success', 'Le signalement a été clôturé (pas de workflow requis).', 'Prise en charge');
      } else if (classification === 'FAUX_SIGNALEMENT') {
        showToast('warning', 'Signalement marqué comme faux. Il a été archivé.');
      }
      await fetchWorkflow();
      onRefresh();
    } catch (error) {
      console.error('Classification failed:', error);
      showToast('error', error.response?.data?.message || 'Erreur lors de la classification');
    }
    setActionLoading('');
  };

  const handleAdvanceStage = async () => {
    if (!wf?._id || !nextStage) return;
    if (stageFiles.length === 0) {
      showToast('warning', 'Vous devez téléverser au moins un document pour valider cette étape.');
      return;
    }

    // For rapportDpe stage, check DPE was generated
    if (nextStage.isDpe && !wf.dpeGenerated) {
      showToast('warning', 'Vous devez d\'abord générer le Rapport DPE par l\'IA avant de valider cette étape.');
      return;
    }

    setActionLoading('stage');
    try {
      const fd = new FormData();
      fd.append('stage', nextStage.key);
      fd.append('content', stageContent || 'Étape validée');
      stageFiles.forEach((f) => fd.append('attachments', f));
      await updateWorkflowStage(wf._id, fd);
      setStageContent('');
      setStageFiles([]);
      await fetchWorkflow();
      onRefresh();
    } catch (error) {
      console.error('Stage advance failed:', error);
      showToast('error', error.response?.data?.message || 'Erreur lors de la validation de l\'étape');
    }
    setActionLoading('');
  };

  const handleDownloadTemplate = async (templateName) => {
    try {
      const { data } = await downloadTemplate(templateName);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${templateName}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download failed:', error);
      showToast('error', 'Erreur lors du téléchargement du template');
    }
  };

  /** Download the AI-generated DPE report as a formatted .docx file */
  const handleDownloadGeneratedDPE = async () => {
    const d = dpeResult?.draft;
    if (!d) return;

    const SOS_BLUE = '1A73E8';
    const SOS_NAVY = '1B2A4A';
    const GRAY_C = '666666';
    const thinBrd = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
    const brd = { top: thinBrd, bottom: thinBrd, left: thinBrd, right: thinBrd };

    const h1 = (t) => new Paragraph({ children: [new TextRun({ text: t, bold: true, color: SOS_NAVY, font: 'Calibri', size: 32 })], heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 } });
    const h2 = (t) => new Paragraph({ children: [new TextRun({ text: t, bold: true, color: SOS_NAVY, font: 'Calibri', size: 26 })], heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 } });
    const p = (t, opts = {}) => new Paragraph({ children: [new TextRun({ text: t || '', font: 'Calibri', size: 22, color: '333333', ...opts })], spacing: { after: 80 } });
    const bl = () => new Paragraph({ spacing: { after: 120 } });
    const tCell = (t, hdr = false) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: t, font: 'Calibri', size: 20, bold: hdr, color: hdr ? 'FFFFFF' : '333333' })], alignment: AlignmentType.LEFT })],
      width: { size: 3000, type: WidthType.DXA },
      shading: hdr ? { type: ShadingType.CLEAR, fill: SOS_BLUE } : undefined,
      borders: brd,
    });

    const children = [
      h1(d.titre || 'Rapport DPE — Diagnostic Psycho-Éducatif'),
      p(`SOS Villages d'Enfants Tunisie`, { italics: true, color: GRAY_C }),
      p(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, { color: GRAY_C }),
      bl(),

      h2('1. RÉSUMÉ DU SIGNALEMENT'),
      p(d.resume_signalement || '—'),

      h2('2. CONTEXTE'),
      p(d.contexte || '—'),

      h2('3. OBSERVATIONS'),
      p(d.observations || '—'),

      h2('4. ÉVALUATION DU RISQUE'),
      p(`Niveau : ${d.evaluation_risque?.niveau?.toUpperCase() || 'N/A'}`, { bold: true }),
      p(`Justification : ${d.evaluation_risque?.justification || 'N/A'}`),

      h2('5. RECOMMANDATIONS'),
      ...(Array.isArray(d.recommandations) && d.recommandations.length
        ? d.recommandations.map((r, i) => p(`${i + 1}. ${r}`))
        : [p('Aucune')]),

      h2('6. PLAN D\'ACTION'),
      ...(Array.isArray(d.plan_action) && d.plan_action.length ? [
        new Table({
          rows: [
            new TableRow({ children: ['#', 'Action', 'Responsable', 'Délai'].map(h => tCell(h, true)) }),
            ...d.plan_action.map((a, i) =>
              new TableRow({ children: [tCell(`${i + 1}`), tCell(a.action || ''), tCell(a.responsable || ''), tCell(a.delai || '')] })
            ),
          ],
          width: { size: 9000, type: WidthType.DXA },
        }),
      ] : [p('Aucun')]),

      h2('7. SUIVI RECOMMANDÉ'),
      p(d.suivi || '—'),

      h2('8. POINTS À VÉRIFIER'),
      ...(Array.isArray(d.points_a_verifier) && d.points_a_verifier.length
        ? d.points_a_verifier.map(pt => p(`☐  ${pt}`))
        : [p('Aucun')]),

      bl(),
      p(d.disclaimer || 'Brouillon généré par IA — à valider par un professionnel qualifié.', { italics: true, color: GRAY_C }),
    ];

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(buffer);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rapport-dpe-genere-${item._id?.slice(-6) || 'draft'}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  /** Generate DPE AI report for the signalement */
  const handleGenerateDPE = async () => {
    if (!item?._id || !wf?._id) return;
    setActionLoading('dpe');
    setDpeResult(null);
    try {
      const { data } = await generateDPE(item._id);
      setDpeResult(data);
      // Mark DPE as generated on the workflow
      await markDpeGenerated(wf._id);
      await fetchWorkflow();
      showToast('success', data.message || 'Rapport DPE généré avec succès!');
    } catch (error) {
      console.error('DPE generation failed:', error);
      showToast('error', error.response?.data?.message || 'Erreur lors de la génération du rapport DPE');
    }
    setActionLoading('');
  };

  /** Close the workflow — all 6 stages must be done */
  const handleCloseWorkflow = async () => {
    if (!wf?._id) return;
    const reason = await showConfirm({ title: 'Clôturer le dossier', message: 'Le dossier sera soumis au Directeur Village pour signature.', withInput: true, inputLabel: 'Raison de clôture (optionnel)', inputPlaceholder: 'Saisissez la raison…', confirmText: 'Clôturer' });
    if (reason === false) return;
    setActionLoading('close');
    try {
      await closeWorkflow(wf._id, reason || undefined);
      showToast('success', 'Dossier soumis au Directeur Village pour signature.');
      await fetchWorkflow();
      onRefresh();
    } catch (error) {
      console.error('Close workflow failed:', error);
      showToast('error', error.response?.data?.message || 'Erreur lors de la clôture');
    }
    setActionLoading('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-24">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[calc(100vh-7rem)] bg-white shadow-xl animate-fade-in rounded-xl mx-4 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-6 py-4 border-b border-sos-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sos-gray-900">Détail du signalement</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-sos-gray-100 cursor-pointer">
            <X className="w-5 h-5 text-sos-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <UrgencyBadge level={item.urgencyLevel} />
              <span className={`text-xs font-medium ${STATUS_MAP[item.status]?.color || 'text-sos-gray-500'}`}>
                {STATUS_MAP[item.status]?.label || item.status}
              </span>
              {item.isAnonymous && (
                <span className="text-xs bg-sos-gray-100 text-sos-gray-600 px-2 py-0.5 rounded-full">Anonyme</span>
              )}
            </div>

            {/* Countdown info for sauvegarded items */}
            {(() => {
              const countdown = getCountdown(item.deadlineAt);
              if (countdown && item.status !== 'CLOTURE' && item.status !== 'FAUX_SIGNALEMENT') {
                return (
                  <div className={`${countdown.bg} border border-current rounded-lg px-3 py-2`}>
                    <div className={`text-sm font-semibold ${countdown.color} flex items-center gap-2`}>
                      <Clock className="w-4 h-4" />
                      <span>{countdown.message}</span>
                      {countdown.expired && <AlertTriangle className="w-4 h-4" />}
                    </div>
                    {item.sauvegardedAt && (
                      <div className="text-xs text-sos-gray-600 mt-1">
                        Sauvegardé le {new Date(item.sauvegardedAt).toLocaleString('fr-FR')}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            <h3 className="text-xl font-bold text-sos-gray-900">
              {item.title || item.incidentType || 'Signalement'}
            </h3>
            <p className="text-sm text-sos-gray-500">
              {item.village?.name || 'Village inconnu'} · {item.program || '—'} · {new Date(item.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>

          {/* Description */}
          <div className="bubble-alt bg-sos-gray-50 border border-sos-gray-200 p-4">
            <p className="text-sm text-sos-gray-700 whitespace-pre-wrap leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* People */}
          {(item.childName || item.abuserName) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {item.childName && (
                <div>
                  <p className="text-sos-gray-400 text-xs mb-0.5">Enfant</p>
                  <p className="font-medium text-sos-gray-800">{item.childName}</p>
                </div>
              )}
              {item.abuserName && (
                <div>
                  <p className="text-sos-gray-400 text-xs mb-0.5">Agresseur présumé</p>
                  <p className="font-medium text-sos-gray-800">{item.abuserName}</p>
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {item.attachments?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide mb-2">Pièces jointes</p>
              <div className="space-y-1.5">
                {item.attachments.map((a, i) => {
                  const mime = a.mimeType || '';
                  const canPreview = mime.startsWith('image/') || mime === 'application/pdf';
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm bg-sos-gray-50 rounded-lg px-3 py-2">
                      <FileText className="w-4 h-4 text-sos-blue shrink-0" />
                      <span className="truncate flex-1 text-sos-gray-700">{a.originalName || a.filename}</span>
                      {canPreview && (
                        <button
                          title="Aperçu"
                          onClick={async () => {
                            try {
                              const { data } = await downloadAttachment(item._id, a.filename);
                              const blob = new Blob([data], { type: mime });
                              const url = window.URL.createObjectURL(blob);
                              setPreviewFile({ url, name: a.originalName || a.filename, type: mime });
                            } catch (err) {
                              console.error('Preview failed:', err);
                              showToast('error', 'Erreur lors de l\'aperçu du fichier.');
                            }
                          }}
                          className="p-1 rounded hover:bg-sos-blue-light transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-sos-blue" />
                        </button>
                      )}
                      <button
                        title="Télécharger"
                        onClick={async () => {
                          try {
                            const { data } = await downloadAttachment(item._id, a.filename);
                            const url = window.URL.createObjectURL(new Blob([data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', a.originalName || a.filename);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            console.error('Download failed:', err);
                            showToast('error', 'Erreur lors du téléchargement du fichier.');
                          }
                        }}
                        className="p-1 rounded hover:bg-sos-blue-light transition cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-sos-blue" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* File preview modal */}
          {previewFile && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                 onClick={() => { window.URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}>
              <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden"
                   onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-sos-gray-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-sos-blue shrink-0" />
                    <span className="text-sm font-semibold text-sos-gray-800 truncate">{previewFile.name}</span>
                  </div>
                  <button onClick={() => { window.URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}
                          className="p-1.5 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer">
                    <X className="w-5 h-5 text-sos-gray-600" />
                  </button>
                </div>
                {/* Content */}
                <div className="flex-1 overflow-auto p-2 bg-sos-gray-50 flex items-center justify-center">
                  {previewFile.type === 'application/pdf' ? (
                    <iframe src={previewFile.url} className="w-full h-full rounded-lg" title={previewFile.name} />
                  ) : previewFile.type.startsWith('image/') ? (
                    <img src={previewFile.url} alt={previewFile.name}
                         className="max-w-full max-h-full object-contain rounded-lg" />
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Prise en charge — no workflow needed */}
          {wf && item.classification === 'PRISE_EN_CHARGE' && (
            <div className="p-4 bg-sos-blue-light border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sos-blue">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-bold">Prise en charge</span>
              </div>
              <p className="text-xs text-sos-gray-600">
                Ce signalement a été pris en charge directement. Aucun workflow de traitement n'est requis
                car la situation ne nécessite pas un suivi psycho-éducatif complet.
              </p>
              {wf.closedAt && (
                <p className="text-[10px] text-sos-gray-400">
                  Clôturé le {new Date(wf.closedAt).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          )}

          {/* Faux signalement — archived */}
          {wf && item.classification === 'FAUX_SIGNALEMENT' && (
            <div className="p-4 bg-sos-gray-100 border border-sos-gray-300 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sos-gray-600">
                <X className="w-5 h-5" />
                <span className="text-sm font-bold">Faux signalement</span>
              </div>
              <p className="text-xs text-sos-gray-500">
                Ce signalement a été identifié comme faux par le psychologue.
                Le dossier a été archivé.
              </p>
              {wf.closedAt && (
                <p className="text-[10px] text-sos-gray-400">
                  Archivé le {new Date(wf.closedAt).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          )}

          {/* Workflow / Progress — only for SAUVEGARDE or not-yet-classified */}
          {wf && (!item.classification || item.classification === 'SAUVEGARDE') && (
            <div>
              <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide mb-3">
                Progression du workflow ({completedStageCount(wf)}/{STAGE_ORDER.length})
              </p>
              {/* Progress bar — 6 stages */}
              <div className="flex items-center gap-0.5 mb-4">
                {STAGE_ORDER.map((stage) => {
                  const done = wf.stages?.[stage.key]?.completed;
                  const active = nextStage?.key === stage.key;
                  return (
                    <div key={stage.key} className="flex-1 space-y-1">
                      <div
                        className={`h-2 rounded-full transition-colors ${
                          done ? 'bg-sos-green' : active ? 'bg-sos-blue animate-pulse' : 'bg-sos-gray-200'
                        }`}
                        title={stage.label}
                      />
                      <p className={`text-[9px] text-center font-medium leading-tight ${
                        done ? 'text-sos-green' : active ? 'text-sos-blue' : 'text-sos-gray-400'
                      }`}>
                        {stage.label}
                        {done && ' ✓'}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Current stage info */}
              {wf.currentStage === 'COMPLETED' || wf.status === 'COMPLETED' ? (
                <div className="flex items-center gap-2 text-sos-green bg-sos-green-light p-3 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Toutes les étapes sont terminées</span>
                </div>
              ) : nextStage ? (
                <p className="text-sm text-sos-blue font-medium">
                  Étape actuelle : {nextStage.label}
                  {wf.stages?.[nextStage.key]?.dueAt && (
                    <span className="text-xs text-sos-gray-500 ml-2">
                      (délai : {new Date(wf.stages[nextStage.key].dueAt).toLocaleString('fr-FR')})
                    </span>
                  )}
                </p>
              ) : null}

              {/* DPE Generation button — appears when we're on the rapportDpe stage */}
              {wf.status === 'ACTIVE' && nextStage?.isDpe && !wf.dpeGenerated && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-purple-700">
                    🤖 Étape IA : Générer le Rapport DPE
                  </p>
                  <p className="text-xs text-purple-600">
                    Cliquez ci-dessous pour générer automatiquement un brouillon DPE à partir des données du signalement.
                    Vous devrez ensuite téléverser le rapport validé.
                  </p>
                  <button
                    onClick={handleGenerateDPE}
                    disabled={actionLoading === 'dpe'}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium
                               hover:bg-purple-700 transition disabled:opacity-60 cursor-pointer"
                  >
                    {actionLoading === 'dpe' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    Générer Rapport DPE
                  </button>
                </div>
              )}

              {/* DPE already generated info */}
              {wf.dpeGenerated && nextStage?.isDpe && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-semibold text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Rapport DPE généré par l'IA
                    {wf.dpeGeneratedAt && (
                      <span className="text-green-500 font-normal ml-1">
                        — {new Date(wf.dpeGeneratedAt).toLocaleString('fr-FR')}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Téléversez maintenant le rapport DPE validé pour compléter cette étape.
                  </p>
                </div>
              )}

              {/* DPE full AI-generated report */}
              {dpeResult?.draft && (
                <div className="mt-2 border border-purple-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowFullDpe(!showFullDpe)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-purple-50 text-xs font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                  >
                    <span>📄 Rapport DPE généré par l'IA {dpeResult.metadata?.mode === 'ollama' ? '(Llama)' : '(modèle de secours)'}</span>
                    <span>{showFullDpe ? '▲ Réduire' : '▼ Voir le rapport complet'}</span>
                  </button>
                  {showFullDpe && (
                    <div className="p-4 bg-white space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar text-xs">
                      {/* Titre */}
                      <h4 className="text-sm font-bold text-sos-gray-900 border-b pb-1">{dpeResult.draft.titre}</h4>

                      {/* Résumé */}
                      <div>
                        <p className="font-semibold text-sos-gray-700 mb-0.5">Résumé du signalement</p>
                        <p className="text-sos-gray-600 whitespace-pre-wrap">{dpeResult.draft.resume_signalement}</p>
                      </div>

                      {/* Contexte */}
                      <div>
                        <p className="font-semibold text-sos-gray-700 mb-0.5">Contexte</p>
                        <p className="text-sos-gray-600 whitespace-pre-wrap">{dpeResult.draft.contexte}</p>
                      </div>

                      {/* Observations */}
                      <div>
                        <p className="font-semibold text-sos-gray-700 mb-0.5">Observations</p>
                        <p className="text-sos-gray-600 whitespace-pre-wrap">{dpeResult.draft.observations}</p>
                      </div>

                      {/* Évaluation du risque */}
                      {dpeResult.draft.evaluation_risque && (
                        <div>
                          <p className="font-semibold text-sos-gray-700 mb-0.5">Évaluation du risque</p>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              dpeResult.draft.evaluation_risque.niveau === 'eleve' ? 'bg-red-100 text-red-700' :
                              dpeResult.draft.evaluation_risque.niveau === 'moyen' ? 'bg-sos-blue-lighter text-sos-blue' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {dpeResult.draft.evaluation_risque.niveau?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sos-gray-600">{dpeResult.draft.evaluation_risque.justification}</p>
                        </div>
                      )}

                      {/* Recommandations */}
                      {Array.isArray(dpeResult.draft.recommandations) && dpeResult.draft.recommandations.length > 0 && (
                        <div>
                          <p className="font-semibold text-sos-gray-700 mb-0.5">Recommandations</p>
                          <ul className="list-disc list-inside space-y-0.5 text-sos-gray-600">
                            {dpeResult.draft.recommandations.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Plan d'action */}
                      {Array.isArray(dpeResult.draft.plan_action) && dpeResult.draft.plan_action.length > 0 && (
                        <div>
                          <p className="font-semibold text-sos-gray-700 mb-0.5">Plan d'action</p>
                          <div className="border border-sos-gray-200 rounded overflow-hidden">
                            <table className="w-full text-[10px]">
                              <thead className="bg-sos-gray-100">
                                <tr>
                                  <th className="px-2 py-1 text-left">Action</th>
                                  <th className="px-2 py-1 text-left">Responsable</th>
                                  <th className="px-2 py-1 text-left">Délai</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dpeResult.draft.plan_action.map((a, i) => (
                                  <tr key={i} className="border-t border-sos-gray-100">
                                    <td className="px-2 py-1">{a.action}</td>
                                    <td className="px-2 py-1">{a.responsable}</td>
                                    <td className="px-2 py-1">{a.delai}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Suivi */}
                      <div>
                        <p className="font-semibold text-sos-gray-700 mb-0.5">Suivi recommandé</p>
                        <p className="text-sos-gray-600 whitespace-pre-wrap">{dpeResult.draft.suivi}</p>
                      </div>

                      {/* Points à vérifier */}
                      {Array.isArray(dpeResult.draft.points_a_verifier) && dpeResult.draft.points_a_verifier.length > 0 && (
                        <div>
                          <p className="font-semibold text-sos-gray-700 mb-0.5">Points à vérifier</p>
                          <ul className="space-y-0.5 text-sos-gray-600">
                            {dpeResult.draft.points_a_verifier.map((p, i) => (
                              <li key={i} className="flex items-start gap-1"><span>☐</span><span>{p}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Disclaimer */}
                      {dpeResult.draft.disclaimer && (
                        <p className="text-[10px] text-sos-gray-400 italic border-t pt-2 mt-2">
                          {dpeResult.draft.disclaimer}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stage content input — only if workflow is active and there is a next stage */}
              {wf.status === 'ACTIVE' && nextStage && (
                /* For DPE stage, only show upload after DPE is generated */
                (!nextStage.isDpe || wf.dpeGenerated) && (
                <div className="mt-3 space-y-3">
                  {/* Download: generated DPE report if available, otherwise template */}
                  {nextStage.isDpe && dpeResult?.draft ? (
                    <button
                      onClick={handleDownloadGeneratedDPE}
                      className="flex items-center gap-1.5 text-xs text-purple-700 font-semibold hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      📥 Télécharger le Rapport DPE généré
                    </button>
                  ) : nextStage.template ? (
                    <button
                      onClick={() => handleDownloadTemplate(nextStage.template)}
                      className="flex items-center gap-1.5 text-xs text-sos-blue hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Télécharger le template : {nextStage.label}
                    </button>
                  ) : null}

                  <textarea
                    value={stageContent}
                    onChange={(e) => setStageContent(e.target.value)}
                    placeholder={`Notes pour : ${nextStage.label}…`}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-sos-gray-300 text-sm
                               placeholder:text-sos-gray-400
                               focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue"
                  />

                  {/* File upload */}
                  <div>
                    <label className="block text-xs font-medium text-sos-gray-700 mb-1">
                      Document à téléverser (obligatoire)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.odt,.jpg,.jpeg,.png"
                      onChange={(e) => setStageFiles(Array.from(e.target.files))}
                      className="block w-full text-sm text-sos-gray-600
                                 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                                 file:text-xs file:font-semibold file:bg-sos-blue-light file:text-sos-blue
                                 hover:file:bg-sos-blue hover:file:text-white file:transition file:cursor-pointer"
                    />
                    {stageFiles.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {stageFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-sos-gray-600">
                            <FileText className="w-3 h-3" />
                            <span className="truncate">{f.name}</span>
                            <span className="text-sos-gray-400">({(f.size / 1024).toFixed(0)} Ko)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAdvanceStage}
                    disabled={actionLoading === 'stage' || stageFiles.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sos-blue text-white text-sm font-medium
                               hover:bg-sos-blue-dark transition disabled:opacity-60 cursor-pointer"
                  >
                    {actionLoading === 'stage' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Valider : {nextStage.label}
                  </button>
                </div>
                )
              )}

              {/* Closure button — only when all 6 stages are COMPLETED */}
              {(wf.currentStage === 'COMPLETED' || completedStageCount(wf) === STAGE_ORDER.length) && wf.status === 'ACTIVE' && (
                <div className="mt-4 p-3 bg-sos-blue-light border border-blue-200 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-sos-blue flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Toutes les 6 étapes sont complétées
                  </p>
                  <p className="text-xs text-sos-gray-600">
                    Soumettez ce dossier au Directeur Village pour signature et validation.
                  </p>
                  <button
                    onClick={handleCloseWorkflow}
                    disabled={actionLoading === 'close'}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sos-blue text-white text-sm font-medium
                               hover:bg-sos-blue-dark transition disabled:opacity-60 cursor-pointer"
                  >
                    {actionLoading === 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Soumettre au Directeur Village
                  </button>
                </div>
              )}

              {/* Already closed */}
              {wf.status === 'COMPLETED' && wf.closedAt && (
                <div className="mt-3 p-3 bg-sos-blue-light border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-sos-blue flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Soumis au Directeur Village le {new Date(wf.closedAt).toLocaleString('fr-FR')}
                  </p>
                  {wf.closureReason && (
                    <p className="text-xs text-sos-gray-600 mt-1">Note : {wf.closureReason}</p>
                  )}
                </div>
              )}

              {/* Penalties / overdue info */}
              {wf.penalties?.length > 0 && (
                <div className="mt-3 p-2 bg-sos-red-light rounded-lg">
                  <p className="text-xs font-semibold text-sos-red">
                    ⚠️ {wf.penalties.length} pénalité{wf.penalties.length > 1 ? 's' : ''} de retard
                  </p>
                  {wf.penalties.map((p, i) => (
                    <p key={i} className="text-[10px] text-sos-red mt-0.5">
                      {p.stage}: {p.delayHours}h de retard
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-sos-gray-200 space-y-2">
            {/* Sauvegarde button: visible when not yet sauvegarded */}
            {item.status === 'EN_ATTENTE' && !alreadySauvegarded && (
              <div className="flex gap-2">
                <button
                  onClick={handleSauvegarder}
                  disabled={actionLoading === 'sauv' || actionLoading === 'faux'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                             bg-sos-coral text-white text-sm font-semibold
                             transition disabled:opacity-60 cursor-pointer"
                >
                  {actionLoading === 'sauv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Sauvegarder
                </button>
                <button
                  onClick={async () => {
                    setActionLoading('faux');
                    try {
                      // Get ML prediction
                      const { data: predictionData } = await predictFalseAlarm(item._id);
                      setMlPrediction(predictionData.prediction);
                      setShowPredictionModal(true);
                      setActionLoading('');
                    } catch (err) {
                      console.error('Prediction failed:', err);
                      // Show error in modal
                      setMlPrediction({ error: 'Connection error' });
                      setShowPredictionModal(true);
                      setActionLoading('');
                    }
                  }}
                  disabled={actionLoading === 'sauv' || actionLoading === 'faux'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                             bg-sos-gray-200 text-sos-gray-700 text-sm font-semibold
                             hover:bg-sos-gray-300 transition disabled:opacity-60 cursor-pointer"
                >
                  {actionLoading === 'faux' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Prédire fausse alarme
                </button>
              </div>
            )}
            {/* Create workflow button: visible when sauvegarded but no workflow yet */}
            {!wf && !loadingWf && alreadySauvegarded && item.status === 'EN_COURS' && (
              <button
                onClick={handleCreateWorkflow}
                disabled={actionLoading === 'wf'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-sos-blue text-white text-sm font-semibold
                           hover:bg-sos-blue-dark transition disabled:opacity-60 cursor-pointer"
              >
                {actionLoading === 'wf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                Démarrer le workflow
              </button>
            )}
            {loadingWf && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-sos-blue" />
                <span className="ml-2 text-xs text-sos-gray-500">Chargement du workflow...</span>
              </div>
            )}
          </div>
        </div>

        {/* ML Prediction Modal */}
        {showPredictionModal && mlPrediction && (
          <MLPredictionModal
            prediction={mlPrediction}
            onConfirm={async () => {
              setShowPredictionModal(false);
              setActionLoading('faux');
              try {
                await markSignalementFaux(item._id);
                setMlPrediction(null);
                onRefresh();
                onClose();
              } catch (err) {
                console.error('markFaux failed:', err);
                showToast('error', err.response?.data?.message || 'Erreur lors du marquage.');
              }
              setActionLoading('');
            }}
            onCancel={() => {
              setShowPredictionModal(false);
              setMlPrediction(null);
            }}
          />
        )}
      </div>

      {/* Toast notification */}
      <Toast toast={toast} onDismiss={dismissToast} />
      <ConfirmModal {...confirmProps} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════ */
function DashboardLevel2() {
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [mainToast, showMainToast, dismissMainToast] = useToast();
  const [dashboardView, setDashboardView] = useState('main'); // 'main' | 'history'

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching signalements...');
      const { data } = await getSignalements();
      console.log('API response:', data);
      const list = Array.isArray(data) ? data : data.signalements || [];
      console.log('Processed signalements:', list);
      setSignalements(list);
    } catch (error) {
      console.error('Error fetching signalements:', error);
      // Show error to user
      showMainToast('error', 'Impossible de charger les signalements. Vérifiez que le serveur backend est démarré.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time countdown updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Only update if there are signalements with deadlines
      const hasDeadlines = signalements.some(s => s.deadlineAt);
      if (hasDeadlines) {
        fetchData();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [signalements, fetchData]);

  /* Refresh after an action + close drawer */
  const handleRefresh = () => {
    fetchData();
    setSelected(null);
  };

  /* Filtering */
  const filtered = signalements.filter((s) => {
    if (filterUrgency && s.urgencyLevel !== filterUrgency) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = `${s.title || ''} ${s.incidentType || ''} ${s.description || ''} ${s.village?.name || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  /* Bucket by status */
  const buckets = {
    EN_ATTENTE: filtered.filter((s) => s.status === 'EN_ATTENTE'),
    EN_COURS: filtered.filter((s) => s.status === 'EN_COURS'),
    CLOTURE: filtered.filter((s) => s.status === 'CLOTURE' || s.status === 'FAUX_SIGNALEMENT'),
  };

  const statCounts = {
    total: signalements.length,
    pending: signalements.filter((s) => s.status === 'EN_ATTENTE').length,
    urgent: signalements.filter((s) => s.urgencyLevel === 'CRITIQUE' || s.urgencyLevel === 'ELEVE').length,
    closed: signalements.filter((s) => s.status === 'CLOTURE').length,
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-sos-blue-lighter via-white to-sos-coral-light overflow-hidden">
      <BackgroundPattern />
      <div className="relative z-10">
      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-sos-gray-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-sos-gray-900">Tableau de bord — Traitement</h1>
              <p className="text-sm text-sos-gray-500">Gestion et suivi des signalements</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell items={signalements} onClickItem={setSelected} />
              <button
                onClick={() => setDashboardView(dashboardView === 'main' ? 'history' : 'main')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg font-medium transition cursor-pointer ${
                  dashboardView === 'history'
                    ? 'bg-sos-blue text-white'
                    : 'bg-sos-gray-100 text-sos-gray-600 hover:bg-sos-gray-200'
                }`}
              >
                <History className="w-4 h-4" />
                Historique
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-3 py-2 text-sm bg-sos-blue text-white rounded-lg font-medium hover:bg-sos-blue-dark transition disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔄'}
              </button>
            </div>
          </div>

          {/* Quick stats */}
          {dashboardView === 'main' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Total', value: statCounts.total, color: 'text-sos-blue', bg: 'bg-sos-blue-light' },
              { label: 'En attente', value: statCounts.pending, color: 'text-sos-blue', bg: 'bg-sos-blue-lighter' },
              { label: 'Urgents', value: statCounts.urgent, color: 'text-sos-red', bg: 'bg-sos-red-light' },
              { label: 'Clôturés', value: statCounts.closed, color: 'text-sos-green', bg: 'bg-sos-green-light' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
                <p className="text-xs font-medium text-sos-gray-500">{s.label}</p>
                <p className={`text-2xl font-extrabold ${s.color} callout-number`}>{s.value}</p>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* ── History View ── */}
      {dashboardView === 'history' && (
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <HistoryPanel />
        </div>
      )}

      {/* ── Filters ── */}
      {dashboardView === 'main' && (
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sos-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-sos-gray-300 text-sm
                         placeholder:text-sos-gray-400
                         focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
            />
          </div>
          {/* Urgency filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sos-gray-400" />
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="px-3 py-2 rounded-lg border border-sos-gray-300 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-sos-blue/40"
            >
              <option value="">Toutes urgences</option>
              {Object.entries(URGENCY).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Kanban Board ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-sos-blue animate-spin" />
            <span className="ml-3 text-sos-gray-600">Chargement des signalements...</span>
          </div>
        ) : signalements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-card">
            <ClipboardList className="w-16 h-16 text-sos-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-sos-gray-800 mb-2">Aucun signalement trouvé</h3>
            <p className="text-sos-gray-500 max-w-md mx-auto mb-6">
              Il n'y a actuellement aucun signalement à traiter. Vérifiez que le serveur backend est démarré et qu'il y a des signalements dans la base de données.
            </p>
            <div className="space-x-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-6 py-2 bg-sos-blue text-white rounded-lg font-medium hover:bg-sos-blue-dark transition disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                Actualiser
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/level1'}
                className="px-6 py-2 bg-sos-gray-200 text-sos-gray-700 rounded-lg font-medium hover:bg-sos-gray-300 transition"
              >
                Créer un signalement (Level 1)
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {KANBAN_COLUMNS.map((col) => (
              <div key={col.key} className={`border-t-4 ${col.accent} bg-white rounded-xl shadow-card overflow-hidden`}>
                {/* Column header */}
                <div className="px-4 py-3 border-b border-sos-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${col.iconBg} flex items-center justify-center`}>
                      <Eye className={`w-4 h-4 ${col.iconColor}`} />
                    </div>
                    <h3 className="text-sm font-bold text-sos-gray-800">{col.label}</h3>
                  </div>
                  <span className="text-xs font-bold bg-sos-gray-100 text-sos-gray-600 px-2 py-0.5 rounded-full">
                    {buckets[col.key].length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-3 kanban-col max-h-[calc(100vh-22rem)] overflow-y-auto custom-scrollbar">
                  {buckets[col.key].length === 0 && (
                    <p className="text-center text-sm text-sos-gray-400 py-8">Aucun signalement</p>
                  )}
                  {buckets[col.key].map((s) => (
                    <SignalementCard key={s._id} item={s} onSelect={setSelected} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* ── Detail Drawer ── */}
      {selected && (
        <DetailDrawer item={selected} onClose={() => setSelected(null)} onRefresh={handleRefresh} />
      )}

      {/* Main dashboard toast */}
      <Toast toast={mainToast} onDismiss={dismissMainToast} />
      </div>
    </div>
  );
}

export default DashboardLevel2;