import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Search,
  ArrowUpRight,
  FileText,
  Eye,
  Loader2,
  X,
  Download,
  Upload,
  Shield,
  FolderOpen,
  Timer,
  Lock,
  CircleAlert,
  Award,
} from 'lucide-react';
import {
  getSignalements,
  sauvegarderSignalement,
  getMyWorkflows,
  updateWorkflowStage,
  classifySignalement as classifyAPI,
  downloadTemplate,
} from '../services/api';

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */

const URGENCY = {
  FAIBLE:   { label: 'Faible',   bg: 'bg-sos-green-light',  text: 'text-sos-green',   dot: 'bg-sos-green' },
  MOYEN:    { label: 'Moyen',    bg: 'bg-sos-yellow-light', text: 'text-yellow-700',   dot: 'bg-sos-yellow' },
  ELEVE:    { label: 'Élevé',    bg: 'bg-orange-100',       text: 'text-orange-700',   dot: 'bg-orange-500' },
  CRITIQUE: { label: 'Critique', bg: 'bg-sos-red-light',    text: 'text-sos-red',      dot: 'bg-sos-red' },
};

const CLASSIFICATION_OPTIONS = [
  { value: 'SAUVEGARDE',        label: 'Sauvegarde',        color: 'bg-sos-red-light text-sos-red' },
  { value: 'PRISE_EN_CHARGE',   label: 'Prise en charge',   color: 'bg-sos-blue-light text-sos-blue' },
  { value: 'FAUX_SIGNALEMENT',  label: 'Faux signalement',  color: 'bg-sos-gray-100 text-sos-gray-600' },
];

const STAGE_INFO = {
  initialReport: { label: 'Rapport Initial', templateName: 'rapport-initial', deadlineH: 24 },
  finalReport:   { label: 'Rapport Final',   templateName: 'rapport-final',   deadlineH: 48 },
};

/* ── Helpers ── */
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

const formatCountdown = (dueAt) => {
  if (!dueAt) return null;
  const remaining = new Date(dueAt).getTime() - Date.now();
  if (remaining <= 0) return { text: 'Délai expiré', expired: true, hours: 0 };

  const totalH = remaining / (1000 * 60 * 60);
  const h = Math.floor(totalH);
  const m = Math.floor((totalH - h) * 60);
  return { text: `${h}h ${m}min restantes`, expired: false, hours: totalH };
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
const NotificationBell = ({ items }) => {
  const [open, setOpen] = useState(false);
  const urgent = items.filter((s) => s.urgencyLevel === 'CRITIQUE' || s.urgencyLevel === 'ELEVE');

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer">
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
            <h3 className="text-sm font-bold text-sos-gray-800">Alertes urgentes</h3>
            <span className="text-xs text-sos-gray-400">{urgent.length}</span>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {urgent.length === 0 && <p className="p-4 text-sm text-sos-gray-400 text-center">Aucune alerte</p>}
            {urgent.map((s) => (
              <div key={s._id} className="px-4 py-3 border-b border-sos-gray-50 last:border-0">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-sos-red shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sos-gray-800 truncate">{s.title || s.incidentType || 'Signalement'}</p>
                    <p className="text-xs text-sos-gray-500 mt-0.5">{s.village?.name || 'Village inconnu'} · {timeAgo(s.createdAt)}</p>
                  </div>
                  <UrgencyBadge level={s.urgencyLevel} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Countdown Badge ── */
const CountdownBadge = ({ dueAt }) => {
  const cd = formatCountdown(dueAt);
  if (!cd) return null;
  if (cd.expired)   return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700"><CircleAlert className="w-3 h-3" />{cd.text}</span>;
  if (cd.hours < 6) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700"><Timer className="w-3 h-3" />{cd.text}</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sos-blue-light text-sos-blue"><Clock className="w-3 h-3" />{cd.text}</span>;
};

/* ── Incoming signalement card ── */
const IncomingCard = ({ item, onSauvegarder }) => {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try { await onSauvegarder(item._id); } catch { /* */ }
    setLoading(false);
  };
  return (
    <div className="bg-white border border-sos-gray-200 rounded-xl p-4 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between mb-2">
        <UrgencyBadge level={item.urgencyLevel} />
        <span className="text-xs text-sos-gray-400">{timeAgo(item.createdAt)}</span>
      </div>
      <h4 className="text-sm font-semibold text-sos-gray-800 mb-1 truncate">{item.title || item.incidentType || 'Signalement'}</h4>
      <p className="text-xs text-sos-gray-500 line-clamp-2 mb-2">{item.description?.substring(0, 140)}</p>
      <div className="flex items-center justify-between text-xs text-sos-gray-400 mb-3">
        <span>{item.village?.name || ''}</span>
        <span>{item.incidentType || ''}</span>
      </div>
      {item.attachments?.length > 0 && (
        <p className="text-xs text-sos-gray-400 mb-2"><FileText className="inline w-3 h-3 mr-1" />{item.attachments.length} pièce(s) jointe(s)</p>
      )}
      <button onClick={handleClick} disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sos-red text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60 cursor-pointer">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
        Sauvegarder (prendre en charge)
      </button>
    </div>
  );
};

/* ── Workflow Dossier Card ── */
const DossierCard = ({ workflow, onSelect }) => {
  const sig = workflow.signalement || {};
  const stagesDone = [workflow.stages?.initialReport?.completed, workflow.stages?.finalReport?.completed].filter(Boolean).length;
  const currentDue = !workflow.stages?.initialReport?.completed
    ? workflow.stages?.initialReport?.dueAt
    : !workflow.stages?.finalReport?.completed
      ? workflow.stages?.finalReport?.dueAt
      : null;

  return (
    <button onClick={() => onSelect(workflow)} className="w-full text-left bg-white border border-sos-gray-200 rounded-xl p-4 hover:shadow-card-hover transition-all group cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <UrgencyBadge level={sig.urgencyLevel} />
        {currentDue && <CountdownBadge dueAt={currentDue} />}
      </div>
      <h4 className="text-sm font-semibold text-sos-gray-800 mb-1 truncate">{sig.title || sig.incidentType || 'Signalement'}</h4>
      <p className="text-xs text-sos-gray-500 mb-3">{sig.village?.name || ''} · {timeAgo(sig.createdAt)}</p>
      {/* 2-step progress */}
      <div className="flex items-center gap-1 mb-1">
        <div className={`h-2 flex-1 rounded-full transition-colors ${workflow.stages?.initialReport?.completed ? 'bg-sos-green' : 'bg-sos-blue animate-pulse'}`} title="Rapport Initial" />
        <div className={`h-2 flex-1 rounded-full transition-colors ${workflow.stages?.finalReport?.completed ? 'bg-sos-green' : workflow.stages?.initialReport?.completed ? 'bg-sos-blue animate-pulse' : 'bg-sos-gray-200'}`} title="Rapport Final" />
      </div>
      <p className="text-xs text-sos-gray-500">{stagesDone}/2 étapes — {workflow.status === 'COMPLETED' ? 'Terminé' : stagesDone === 0 ? 'Rapport Initial' : 'Rapport Final'}</p>
      {/* Penalties */}
      {workflow.penalties?.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <CircleAlert className="w-3 h-3" />
          {workflow.penalties.length} pénalité(s) — retard
        </div>
      )}
      <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="w-4 h-4 text-sos-blue" />
      </div>
    </button>
  );
};

/* ── Stage Panel (inside drawer) ── */
const StagePanel = ({ stageKey, stageData, workflowId, isLocked, onRefresh }) => {
  const info = STAGE_INFO[stageKey];
  const [file, setFile] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const inputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    setDlLoading(true);
    try {
      const res = await downloadTemplate(info.templateName);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${info.templateName}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { /* */ }
    setDlLoading(false);
  };

  const handleValidate = async () => {
    if (!file && !(stageData?.attachments?.length > 0)) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('stage', stageKey);
      fd.append('content', content || 'Étape validée');
      if (file) fd.append('attachments', file);
      await updateWorkflowStage(workflowId, fd);
      setFile(null);
      setContent('');
      onRefresh();
    } catch { /* */ }
    setLoading(false);
  };

  const completed = stageData?.completed;
  const cd = formatCountdown(stageData?.dueAt);

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${completed ? 'border-sos-green bg-green-50/40' : isLocked ? 'border-sos-gray-200 bg-sos-gray-50 opacity-60' : 'border-sos-blue bg-sos-blue-light/20'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {completed ? <CheckCircle2 className="w-5 h-5 text-sos-green" /> : isLocked ? <Lock className="w-5 h-5 text-sos-gray-400" /> : <FileText className="w-5 h-5 text-sos-blue" />}
          <h4 className="font-bold text-sm text-sos-gray-800">{info.label}</h4>
        </div>
        {!completed && !isLocked && cd && <CountdownBadge dueAt={stageData?.dueAt} />}
        {completed && <span className="text-xs text-sos-green font-semibold">Complété</span>}
      </div>

      {/* Overdue warning */}
      {stageData?.isOverdue && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
          <CircleAlert className="w-3.5 h-3.5" />Soumis en retard — pénalité enregistrée
        </div>
      )}

      {isLocked && !completed && (
        <p className="text-xs text-sos-gray-500 italic">Verrouillé — terminez l&apos;étape précédente d&apos;abord.</p>
      )}

      {/* Completed info */}
      {completed && (
        <div className="text-xs text-sos-gray-500 space-y-1">
          <p>Validé le {new Date(stageData.completedAt).toLocaleString('fr-FR')}</p>
          {stageData.attachments?.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-sos-gray-100">
              <FileText className="w-3 h-3 text-sos-blue" />
              <span className="truncate">{a.originalName || a.filename}</span>
            </div>
          ))}
        </div>
      )}

      {/* Active stage — download + upload + validate */}
      {!completed && !isLocked && (
        <>
          {/* Download template */}
          <button onClick={handleDownloadTemplate} disabled={dlLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-sos-blue text-sos-blue text-sm font-medium hover:bg-sos-blue-light transition disabled:opacity-60 cursor-pointer">
            {dlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Télécharger le modèle
          </button>

          {/* Upload zone */}
          <div className="space-y-1">
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt,.odt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-sos-gray-300 text-sm text-sos-gray-600 hover:border-sos-blue hover:text-sos-blue transition cursor-pointer">
              <Upload className="w-4 h-4" />
              {file ? file.name : 'Téléverser le document rempli'}
            </button>
            {stageData?.attachments?.length > 0 && (
              <div className="text-xs text-sos-gray-500">{stageData.attachments.length} fichier(s) déjà téléversé(s)</div>
            )}
          </div>

          {/* Notes */}
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={`Notes pour ${info.label}…`} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-sos-gray-300 text-sm placeholder:text-sos-gray-400 focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue" />

          {/* Validate button */}
          <button onClick={handleValidate} disabled={loading || (!file && !(stageData?.attachments?.length > 0))}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sos-blue text-white text-sm font-semibold hover:bg-sos-blue-dark transition disabled:opacity-50 cursor-pointer">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Valider : {info.label}
          </button>
        </>
      )}
    </div>
  );
};

/* ── Detail Drawer for a Workflow Dossier ── */
const DossierDrawer = ({ workflow, onClose, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState('');
  if (!workflow) return null;

  const sig = workflow.signalement || {};
  const wf = workflow;

  const handleClassify = async (classification) => {
    if (!wf._id) return;
    setActionLoading('cls');
    try { await classifyAPI(wf._id, { classification }); onRefresh(); } catch { /* */ }
    setActionLoading('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-sos-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sos-gray-900">Dossier de traitement</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-sos-gray-100 cursor-pointer"><X className="w-5 h-5 text-sos-gray-500" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Signalement info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <UrgencyBadge level={sig.urgencyLevel} />
              {sig.isAnonymous && <span className="text-xs bg-sos-gray-100 text-sos-gray-600 px-2 py-0.5 rounded-full">Anonyme</span>}
            </div>
            <h3 className="text-xl font-bold text-sos-gray-900">{sig.title || sig.incidentType || 'Signalement'}</h3>
            <p className="text-sm text-sos-gray-500">{sig.village?.name || 'Village inconnu'} · {sig.program || '—'} · {new Date(sig.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>

          {/* Description */}
          <div className="bg-sos-gray-50 border border-sos-gray-200 p-4 rounded-xl">
            <p className="text-sm text-sos-gray-700 whitespace-pre-wrap leading-relaxed">{sig.description}</p>
          </div>

          {/* People */}
          {(!sig.isAnonymous && (sig.childName || sig.abuserName)) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {sig.childName && <div><p className="text-sos-gray-400 text-xs mb-0.5">Enfant</p><p className="font-medium text-sos-gray-800">{sig.childName}</p></div>}
              {sig.abuserName && <div><p className="text-sos-gray-400 text-xs mb-0.5">Agresseur présumé</p><p className="font-medium text-sos-gray-800">{sig.abuserName}</p></div>}
            </div>
          )}

          {/* Signalement attachments */}
          {sig.attachments?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide mb-2">Pièces jointes du signalement</p>
              <div className="space-y-1.5">
                {sig.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-sos-gray-50 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-sos-blue" />
                    <span className="truncate flex-1 text-sos-gray-700">{a.originalName || a.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classification */}
          {!sig.classification && wf.status === 'ACTIVE' && (
            <div>
              <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide mb-2">Classification</p>
              <div className="flex flex-wrap gap-2">
                {CLASSIFICATION_OPTIONS.map((c) => (
                  <button key={c.value} onClick={() => handleClassify(c.value)} disabled={actionLoading === 'cls'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${c.color} hover:opacity-80 disabled:opacity-50`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {sig.classification && (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-sos-blue" />
              <span className="text-sm font-medium text-sos-gray-700">Classification : <strong>{sig.classification}</strong></span>
            </div>
          )}

          {/* ── Two-Step Workflow ── */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide">Workflow — 2 étapes</p>

            {/* Step 1: Rapport Initial */}
            <StagePanel
              stageKey="initialReport"
              stageData={wf.stages?.initialReport}
              workflowId={wf._id}
              isLocked={false}
              onRefresh={onRefresh}
            />

            {/* Step 2: Rapport Final — locked until step 1 done */}
            <StagePanel
              stageKey="finalReport"
              stageData={wf.stages?.finalReport}
              workflowId={wf._id}
              isLocked={!wf.stages?.initialReport?.completed}
              onRefresh={onRefresh}
            />
          </div>

          {/* Penalties summary */}
          {wf.penalties?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                <Award className="w-4 h-4" />Pénalités ({wf.penalties.length})
              </div>
              {wf.penalties.map((p, i) => (
                <p key={i} className="text-xs text-red-600">
                  {STAGE_INFO[p.stage]?.label || p.stage} — retard de {p.delayHours}h (date limite : {new Date(p.dueAt).toLocaleString('fr-FR')})
                </p>
              ))}
            </div>
          )}

          {/* Completed badge */}
          {wf.status === 'COMPLETED' && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle2 className="w-6 h-6 text-sos-green" />
              <div>
                <p className="text-sm font-bold text-green-800">Dossier terminé</p>
                <p className="text-xs text-green-600">Toutes les étapes ont été complétées.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════ */
function DashboardLevel2() {
  const [tab, setTab] = useState('incoming');
  const [incomingList, setIncomingList] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWf, setSelectedWf] = useState(null);
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');

  /* ── Fetch incoming EN_ATTENTE signalements ── */
  const fetchIncoming = useCallback(async () => {
    try {
      const { data } = await getSignalements();
      const list = Array.isArray(data) ? data : data.signalements || [];
      setIncomingList(list.filter(s => s.status === 'EN_ATTENTE'));
    } catch { /* */ }
  }, []);

  /* ── Fetch my workflows ── */
  const fetchWorkflows = useCallback(async () => {
    try {
      const { data } = await getMyWorkflows();
      setWorkflows(Array.isArray(data) ? data : []);
    } catch { /* */ }
  }, []);

  /* ── Initial load ── */
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchIncoming(), fetchWorkflows()]).finally(() => setLoading(false));
  }, [fetchIncoming, fetchWorkflows]);

  /* ── Sauvegarder action ── */
  const handleSauvegarder = async (id) => {
    await sauvegarderSignalement(id);
    await Promise.all([fetchIncoming(), fetchWorkflows()]);
    setTab('dossiers');
  };

  /* ── Refresh after drawer action ── */
  const handleRefresh = async () => {
    await Promise.all([fetchIncoming(), fetchWorkflows()]);
  };

  // Re-sync selected workflow when workflows list updates
  useEffect(() => {
    if (selectedWf) {
      const updated = workflows.find(w => w._id === selectedWf._id);
      if (updated) setSelectedWf(updated);
    }
  }, [workflows]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Filter helper ── */
  const filterItem = (item) => {
    const sig = item.signalement || item;
    if (filterUrgency && sig.urgencyLevel !== filterUrgency) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = `${sig.title || ''} ${sig.incidentType || ''} ${sig.description || ''} ${sig.village?.name || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  };

  const filteredIncoming = incomingList.filter(filterItem);
  const filteredDossiers = workflows.filter(filterItem);
  const activeWfs = workflows.filter(w => w.status === 'ACTIVE');
  const overdueCount = workflows.filter(w => w.penalties?.length > 0).length;

  const stats = [
    { label: 'Entrants',     value: incomingList.length,                                     color: 'text-yellow-700', bg: 'bg-sos-yellow-light' },
    { label: 'Mes dossiers', value: activeWfs.length,                                         color: 'text-sos-blue',   bg: 'bg-sos-blue-light' },
    { label: 'Terminés',     value: workflows.filter(w => w.status === 'COMPLETED').length,   color: 'text-sos-green',  bg: 'bg-sos-green-light' },
    { label: 'En retard',    value: overdueCount,                                              color: 'text-sos-red',    bg: 'bg-sos-red-light' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50">
      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-sos-gray-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-sos-gray-900">Tableau de bord — Psychologue</h1>
              <p className="text-sm text-sos-gray-500">Workflow de sauvegarde en 2 étapes</p>
            </div>
            <NotificationBell items={incomingList} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {stats.map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
                <p className="text-xs font-medium text-sos-gray-500">{s.label}</p>
                <p className={`text-2xl font-extrabold ${s.color} callout-number`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Bar + Filters ── */}
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-sos-gray-200 w-fit mb-4">
          <button onClick={() => setTab('incoming')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${tab === 'incoming' ? 'bg-sos-blue text-white' : 'text-sos-gray-600 hover:bg-sos-gray-100'}`}>
            <Eye className="w-4 h-4" />Signalements entrants
            {incomingList.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20">{incomingList.length}</span>}
          </button>
          <button onClick={() => setTab('dossiers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${tab === 'dossiers' ? 'bg-sos-blue text-white' : 'text-sos-gray-600 hover:bg-sos-gray-100'}`}>
            <FolderOpen className="w-4 h-4" />Mes dossiers
            {activeWfs.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20">{activeWfs.length}</span>}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sos-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-sos-gray-300 text-sm placeholder:text-sos-gray-400 focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sos-gray-400" />
            <select value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)}
              className="px-3 py-2 rounded-lg border border-sos-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sos-blue/40">
              <option value="">Toutes urgences</option>
              {Object.entries(URGENCY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-sos-blue animate-spin" /></div>
        ) : tab === 'incoming' ? (
          filteredIncoming.length === 0 ? (
            <div className="text-center py-16 text-sos-gray-400">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Aucun signalement en attente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              {filteredIncoming.map((s) => <IncomingCard key={s._id} item={s} onSauvegarder={handleSauvegarder} />)}
            </div>
          )
        ) : (
          filteredDossiers.length === 0 ? (
            <div className="text-center py-16 text-sos-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Aucun dossier en cours</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              {filteredDossiers.map((wf) => <DossierCard key={wf._id} workflow={wf} onSelect={setSelectedWf} />)}
            </div>
          )
        )}
      </div>

      {/* ── Dossier Drawer ── */}
      {selectedWf && <DossierDrawer workflow={selectedWf} onClose={() => setSelectedWf(null)} onRefresh={handleRefresh} />}
    </div>
  );
}

export default DashboardLevel2;
