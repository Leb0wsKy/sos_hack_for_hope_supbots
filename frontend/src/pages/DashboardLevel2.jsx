import { useState, useEffect, useCallback } from 'react';
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
  UserPlus,
  Loader2,
  X,
  ClipboardList,
  Activity,
  Shield,
} from 'lucide-react';
import {
  getSignalements,
  sauvegarderSignalement,
  createWorkflow,
  updateWorkflowStage,
  classifySignalement as classifyAPI,
} from '../services/api';

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */

const URGENCY = {
  FAIBLE: { label: 'Faible', bg: 'bg-sos-green-light', text: 'text-sos-green', dot: 'bg-sos-green' },
  MOYEN: { label: 'Moyen', bg: 'bg-sos-yellow-light', text: 'text-yellow-700', dot: 'bg-sos-yellow' },
  ELEVE: { label: 'Élevé', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  CRITIQUE: { label: 'Critique', bg: 'bg-sos-red-light', text: 'text-sos-red', dot: 'bg-sos-red' },
};

const STATUS_MAP = {
  EN_ATTENTE: { label: 'En attente', color: 'text-sos-yellow', icon: Clock },
  EN_COURS: { label: 'En cours', color: 'text-sos-blue', icon: Activity },
  CLOTURE: { label: 'Clôturé', color: 'text-sos-green', icon: CheckCircle2 },
  FAUX_SIGNALEMENT: { label: 'Faux signalement', color: 'text-sos-gray-400', icon: X },
};

const KANBAN_COLUMNS = [
  { key: 'EN_ATTENTE', label: 'En attente', accent: 'border-sos-yellow', iconBg: 'bg-sos-yellow-light', iconColor: 'text-yellow-700' },
  { key: 'EN_COURS', label: 'En cours de traitement', accent: 'border-sos-blue', iconBg: 'bg-sos-blue-light', iconColor: 'text-sos-blue' },
  { key: 'CLOTURE', label: 'Clôturés', accent: 'border-sos-green', iconBg: 'bg-sos-green-light', iconColor: 'text-sos-green' },
];


const CLASSIFICATION_OPTIONS = [
  { value: 'SAUVEGARDE', label: 'Sauvegarde', color: 'bg-sos-red-light text-sos-red' },
  { value: 'PRISE_EN_CHARGE', label: 'Prise en charge', color: 'bg-sos-blue-light text-sos-blue' },
  { value: 'FAUX_SIGNALEMENT', label: 'Faux signalement', color: 'bg-sos-gray-100 text-sos-gray-600' },
];

/**
 * Ordered mapping: camelCase stage key → enum value.
 * The backend `updateWorkflowStage` expects the camelCase key in `req.body.stage`,
 * while `workflow.currentStage` stores the enum value after completion.
 */
const STAGE_ORDER = [
  { key: 'initialReport', enum: 'INITIAL', label: 'Rapport initial' },
  { key: 'dpeReport', enum: 'DPE', label: 'Rapport DPE' },
  { key: 'evaluation', enum: 'EVALUATION', label: 'Évaluation' },
  { key: 'actionPlan', enum: 'ACTION_PLAN', label: 'Plan d\'action' },
  { key: 'followUpReport', enum: 'FOLLOW_UP', label: 'Suivi' },
  { key: 'finalReport', enum: 'FINAL_REPORT', label: 'Rapport final' },
  { key: 'closureNotice', enum: 'CLOSURE', label: 'Clôture' },
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
      {/* Workflow stage */}
      {item.workflow && typeof item.workflow === 'object' && (
        <div className="mt-2 pt-2 border-t border-sos-gray-100 flex items-center gap-1.5 text-xs text-sos-blue">
          <ClipboardList className="w-3.5 h-3.5" />
          {(() => {
            const next = getNextStage(item.workflow);
            return next ? next.label : 'Terminé';
          })()}
        </div>
      )}
      {/* Arrow on hover */}
      <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="w-4 h-4 text-sos-blue" />
      </div>
    </button>
  );
};

/* ── Detail Drawer ── */
const DetailDrawer = ({ item, onClose, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState('');
  const [stageContent, setStageContent] = useState('');

  if (!item) return null;

  const wf = item.workflow && typeof item.workflow === 'object' ? item.workflow : null;
  const nextStage = wf ? getNextStage(wf) : null;

  const handleSauvegarder = async () => {
    setActionLoading('sauv');
    try {
      await sauvegarderSignalement(item._id);
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading('');
  };

  const handleCreateWorkflow = async () => {
    setActionLoading('wf');
    try {
      await createWorkflow({ signalementId: item._id });
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading('');
  };

  const handleClassify = async (classification) => {
    if (!wf?._id) return;
    setActionLoading('cls');
    try {
      await classifyAPI(wf._id, { classification });
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading('');
  };

  const handleAdvanceStage = async () => {
    if (!wf?._id || !nextStage) return;
    setActionLoading('stage');
    const fd = new FormData();
    fd.append('stage', nextStage.key);
    fd.append('content', stageContent || 'Étape validée');
    try {
      await updateWorkflowStage(wf._id, fd);
      setStageContent('');
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-sos-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sos-gray-900">Détail du signalement</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-sos-gray-100 cursor-pointer">
            <X className="w-5 h-5 text-sos-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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
          {(!item.isAnonymous && (item.childName || item.abuserName)) && (
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
                {item.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-sos-gray-50 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-sos-blue" />
                    <span className="truncate flex-1 text-sos-gray-700">{a.originalName || a.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflow / Progress */}
          {wf && (
            <div>
              <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide mb-3">
                Progression du workflow
              </p>
              {/* Progress bar — based on actual stage completion, not currentStage enum */}
              <div className="flex items-center gap-1 mb-4">
                {STAGE_ORDER.map((stage) => {
                  const done = wf.stages?.[stage.key]?.completed;
                  const active = nextStage?.key === stage.key;
                  return (
                    <div
                      key={stage.key}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        done ? 'bg-sos-green' : active ? 'bg-sos-blue' : 'bg-sos-gray-200'
                      }`}
                      title={stage.label}
                    />
                  );
                })}
              </div>
              <p className="text-sm text-sos-blue font-medium">
                {nextStage
                  ? `Étape actuelle : ${nextStage.label}`
                  : 'Toutes les étapes sont terminées'}
              </p>

              {/* Stage content input — only if workflow is active and there is a next stage */}
              {wf.status === 'ACTIVE' && nextStage && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={stageContent}
                    onChange={(e) => setStageContent(e.target.value)}
                    placeholder={`Contenu pour : ${nextStage.label}…`}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-sos-gray-300 text-sm
                               placeholder:text-sos-gray-400
                               focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue"
                  />
                  <button
                    onClick={handleAdvanceStage}
                    disabled={actionLoading === 'stage'}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sos-blue text-white text-sm font-medium
                               hover:bg-sos-blue-dark transition disabled:opacity-60 cursor-pointer"
                  >
                    {actionLoading === 'stage' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Valider : {nextStage.label}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Classification */}
          {wf && !item.classification && (
            <div>
              <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide mb-2">Classification</p>
              <div className="flex flex-wrap gap-2">
                {CLASSIFICATION_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => handleClassify(c.value)}
                    disabled={actionLoading === 'cls'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${c.color} hover:opacity-80 disabled:opacity-50`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.classification && (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-sos-blue" />
              <span className="text-sm font-medium text-sos-gray-700">
                Classification : <strong>{item.classification}</strong>
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-sos-gray-200 space-y-2">
            {item.status === 'EN_ATTENTE' && !wf && (
              <>
                <button
                  onClick={handleSauvegarder}
                  disabled={actionLoading === 'sauv'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                             bg-sos-red text-white text-sm font-semibold
                             hover:bg-red-700 transition disabled:opacity-60 cursor-pointer"
                >
                  {actionLoading === 'sauv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Sauvegarder (prendre en charge)
                </button>
                <button
                  onClick={handleCreateWorkflow}
                  disabled={actionLoading === 'wf'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                             bg-sos-blue text-white text-sm font-semibold
                             hover:bg-sos-blue-dark transition disabled:opacity-60 cursor-pointer"
                >
                  {actionLoading === 'wf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Créer un workflow
                </button>
              </>
            )}
          </div>
        </div>
      </div>
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getSignalements();
      const list = Array.isArray(data) ? data : data.signalements || [];
      setSignalements(list);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50">
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
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Total', value: statCounts.total, color: 'text-sos-blue', bg: 'bg-sos-blue-light' },
              { label: 'En attente', value: statCounts.pending, color: 'text-yellow-700', bg: 'bg-sos-yellow-light' },
              { label: 'Urgents', value: statCounts.urgent, color: 'text-sos-red', bg: 'bg-sos-red-light' },
              { label: 'Clôturés', value: statCounts.closed, color: 'text-sos-green', bg: 'bg-sos-green-light' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
                <p className="text-xs font-medium text-sos-gray-500">{s.label}</p>
                <p className={`text-2xl font-extrabold ${s.color} callout-number`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
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

      {/* ── Detail Drawer ── */}
      {selected && (
        <DetailDrawer item={selected} onClose={() => setSelected(null)} onRefresh={handleRefresh} />
      )}
    </div>
  );
}

export default DashboardLevel2;
