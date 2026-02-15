import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Shield,
  FileWarning,
  Users,
  RefreshCw,
  Download,
  Loader2,
  X,
  Eye,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Archive,
  ChevronRight,
} from 'lucide-react';
import {
  getAnalytics,
  getSignalements,
  closeSignalement,
  archiveSignalement,
  exportData,
  downloadAttachment,
} from '../services/api';

/* ═══════════════════════════════════════════════════════
   Constants & Helpers
   ═══════════════════════════════════════════════════════ */
const URGENCY = {
  FAIBLE:   { label: 'Faible',   bg: 'bg-sos-green-light', text: 'text-sos-green', dot: 'bg-sos-green' },
  MOYEN:    { label: 'Moyen',    bg: 'bg-sos-yellow-light', text: 'text-yellow-700', dot: 'bg-sos-yellow' },
  ELEVE:    { label: 'Élevé',    bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  CRITIQUE: { label: 'Critique', bg: 'bg-sos-red-light', text: 'text-sos-red', dot: 'bg-sos-red' },
};

const STATUS_MAP = {
  EN_ATTENTE:       { label: 'En attente',       color: 'text-yellow-700',    bg: 'bg-sos-yellow-light' },
  EN_COURS:         { label: 'En cours',          color: 'text-sos-blue',      bg: 'bg-sos-blue-light' },
  CLOTURE:          { label: 'Clôturé',           color: 'text-sos-green',     bg: 'bg-sos-green-light' },
  FAUX_SIGNALEMENT: { label: 'Faux signalement',  color: 'text-sos-gray-500', bg: 'bg-sos-gray-100' },
};

const INCIDENT_LABELS = {
  VIOLENCE_PHYSIQUE: 'Violence physique',
  VIOLENCE_PSYCHOLOGIQUE: 'Violence psycho.',
  VIOLENCE_SEXUELLE: 'Violence sexuelle',
  NEGLIGENCE: 'Négligence',
  SANTE: 'Santé',
  COMPORTEMENT: 'Comportement',
  EDUCATION: 'Éducation',
  FAMILIAL: 'Familial',
  AUTRE: 'Autre',
};

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */
const StatCard = ({ label, value, icon: Icon, color, bgLight }) => (
  <div className="relative overflow-hidden rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-[2rem]
                  bg-white border border-sos-gray-200 shadow-card p-5 hover:shadow-card-hover transition-shadow">
    <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${bgLight} opacity-60`} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-sos-gray-500">{label}</p>
        <p className={`text-3xl mt-1 font-extrabold ${color}`}>{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-2xl ${bgLight} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  </div>
);

const HorizontalBar = ({ value, max, color = 'bg-sos-blue' }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2.5 bg-sos-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Signalement Detail Drawer
   ═══════════════════════════════════════════════════════ */
const DetailDrawer = ({ item, onClose, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState('');
  const [previewFile, setPreviewFile] = useState(null);

  if (!item) return null;

  const urg = URGENCY[item.urgencyLevel] || URGENCY.FAIBLE;
  const st = STATUS_MAP[item.status] || STATUS_MAP.EN_ATTENTE;

  const handleClose = async () => {
    const reason = prompt('Raison de la clôture :');
    if (!reason) return;
    setActionLoading('close');
    try {
      await closeSignalement(item._id, reason);
      alert('✅ Signalement clôturé.');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la clôture.');
    }
    setActionLoading('');
  };

  const handleArchive = async () => {
    if (!confirm('Archiver ce signalement ? Cette action est irréversible.')) return;
    setActionLoading('archive');
    try {
      await archiveSignalement(item._id);
      alert('✅ Signalement archivé.');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de l\'archivage.');
    }
    setActionLoading('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-sos-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-sos-gray-900">Détail du signalement</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer">
            <X className="w-5 h-5 text-sos-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status + Urgency */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${urg.bg} ${urg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />
              {urg.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>
              {st.label}
            </span>
            {item.escalated && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sos-red-light text-sos-red">
                ⚠ Escaladé
              </span>
            )}
          </div>

          {/* Title + meta */}
          <div>
            <h3 className="text-xl font-bold text-sos-gray-900">{item.title || item.incidentType}</h3>
            <p className="text-sm text-sos-gray-500 mt-1">
              {item.village?.name || '—'} · {INCIDENT_LABELS[item.incidentType] || item.incidentType} · {fmtDate(item.createdAt)}
            </p>
          </div>

          {/* Description */}
          {item.description && (
            <div className="bg-sos-gray-50 rounded-xl p-4">
              <p className="text-sm text-sos-gray-700 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            {item.childName && (
              <div>
                <p className="text-sos-gray-400 text-xs mb-0.5">Enfant</p>
                <p className="font-medium text-sos-gray-800">{item.childName}</p>
              </div>
            )}
            {item.childAge && (
              <div>
                <p className="text-sos-gray-400 text-xs mb-0.5">Âge</p>
                <p className="font-medium text-sos-gray-800">{item.childAge} ans</p>
              </div>
            )}
            {item.abuserName && (
              <div>
                <p className="text-sos-gray-400 text-xs mb-0.5">Agresseur présumé</p>
                <p className="font-medium text-sos-gray-800">{item.abuserName}</p>
              </div>
            )}
            {item.createdBy && (
              <div>
                <p className="text-sos-gray-400 text-xs mb-0.5">Déclarant</p>
                <p className="font-medium text-sos-gray-800">{item.createdBy?.name || '—'}</p>
              </div>
            )}
            {item.assignedTo && (
              <div>
                <p className="text-sos-gray-400 text-xs mb-0.5">Assigné à</p>
                <p className="font-medium text-sos-gray-800">{item.assignedTo?.name || '—'}</p>
              </div>
            )}
            {item.classification && (
              <div>
                <p className="text-sos-gray-400 text-xs mb-0.5">Classification</p>
                <p className="font-medium text-sos-gray-800">{item.classification}</p>
              </div>
            )}
          </div>

          {/* Escalation note */}
          {item.escalated && item.escalationNote && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-sos-red uppercase tracking-wide mb-1">Note d'escalade</p>
              <p className="text-sm text-sos-gray-700">{item.escalationNote}</p>
              {item.escalatedAt && (
                <p className="text-[10px] text-sos-gray-400 mt-2">Escaladé le {fmtDate(item.escalatedAt)}</p>
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
                        <button title="Aperçu" onClick={async () => {
                          try {
                            const { data } = await downloadAttachment(item._id, a.filename);
                            const blob = new Blob([data], { type: mime });
                            setPreviewFile({ url: URL.createObjectURL(blob), name: a.originalName || a.filename, type: mime });
                          } catch { alert('Erreur lors de l\'aperçu.'); }
                        }} className="p-1 rounded hover:bg-sos-blue-light transition cursor-pointer">
                          <Eye className="w-4 h-4 text-sos-blue" />
                        </button>
                      )}
                      <button title="Télécharger" onClick={async () => {
                        try {
                          const { data } = await downloadAttachment(item._id, a.filename);
                          const url = URL.createObjectURL(new Blob([data]));
                          const link = document.createElement('a'); link.href = url;
                          link.setAttribute('download', a.originalName || a.filename);
                          document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
                        } catch { alert('Erreur lors du téléchargement.'); }
                      }} className="p-1 rounded hover:bg-sos-blue-light transition cursor-pointer">
                        <Download className="w-4 h-4 text-sos-blue" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Closure info */}
          {item.status === 'CLOTURE' && item.closedAt && (
            <div className="bg-sos-green-light border border-green-200 rounded-xl p-4">
              <p className="text-xs font-bold text-sos-green uppercase tracking-wide mb-1">Clôturé</p>
              <p className="text-sm text-sos-gray-700">{item.closureReason || 'Aucune raison spécifiée'}</p>
              <p className="text-[10px] text-sos-gray-400 mt-1">Le {fmtDate(item.closedAt)}</p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-sos-gray-200 space-y-2">
            {item.status === 'EN_COURS' && (
              <button
                onClick={handleClose}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-sos-green text-white text-sm font-semibold
                           hover:bg-green-700 transition disabled:opacity-60 cursor-pointer"
              >
                {actionLoading === 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Clôturer le signalement
              </button>
            )}
            {item.status === 'CLOTURE' && !item.isArchived && (
              <button
                onClick={handleArchive}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-sos-gray-200 text-sos-gray-700 text-sm font-semibold
                           hover:bg-sos-gray-300 transition disabled:opacity-60 cursor-pointer"
              >
                {actionLoading === 'archive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                Archiver
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File preview modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
             onClick={() => { URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-sos-gray-200">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-sos-blue shrink-0" />
                <span className="text-sm font-semibold text-sos-gray-800 truncate">{previewFile.name}</span>
              </div>
              <button onClick={() => { URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}
                      className="p-1.5 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer">
                <X className="w-5 h-5 text-sos-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 bg-sos-gray-50 flex items-center justify-center">
              {previewFile.type === 'application/pdf' ? (
                <iframe src={previewFile.url} className="w-full h-full rounded-lg" title={previewFile.name} />
              ) : previewFile.type.startsWith('image/') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg" />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Signalement Card
   ═══════════════════════════════════════════════════════ */
const SignalementCard = ({ item, onClick }) => {
  const urg = URGENCY[item.urgencyLevel] || URGENCY.FAIBLE;
  const st = STATUS_MAP[item.status] || STATUS_MAP.EN_ATTENTE;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-sos-gray-200 rounded-xl p-4 hover:shadow-card-hover
                 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${urg.bg} ${urg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />
          {urg.label}
        </span>
        <span className="text-xs text-sos-gray-400">{fmtShort(item.createdAt)}</span>
      </div>

      {item.escalated && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sos-red-light text-sos-red">
            <AlertTriangle className="w-3 h-3" /> Escaladé
          </span>
        </div>
      )}

      <h4 className="text-sm font-semibold text-sos-gray-800 mb-1 line-clamp-1">
        {item.title || item.incidentType}
      </h4>
      <p className="text-xs text-sos-gray-500 mb-2 line-clamp-1">{item.description}</p>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
        <ChevronRight className="w-4 h-4 text-sos-gray-300 group-hover:text-sos-blue transition" />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Main Dashboard — Directeur Village
   ═══════════════════════════════════════════════════════ */
export default function DashboardDirecteur() {
  const [analytics, setAnalytics] = useState(null);
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('escalated'); // escalated | all | closed
  const [exporting, setExporting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, signalementsRes] = await Promise.all([
        getAnalytics(),
        getSignalements(),
      ]);
      setAnalytics(analyticsRes.data);
      const list = Array.isArray(signalementsRes.data) ? signalementsRes.data : signalementsRes.data.signalements || [];
      setSignalements(list);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await exportData({});
      const records = data.data || [];
      if (records.length === 0) { setExporting(false); return; }
      const headers = Object.keys(records[0]);
      const csvRows = [
        headers.join(','),
        ...records.map(r => headers.map(h => {
          const val = r[h];
          if (val == null) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(','))
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `export-village-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /* */ }
    setExporting(false);
  };

  // Filter signalements by tab
  const escalated = signalements.filter(s => s.escalated && s.escalatedTo?.includes('DIRECTEUR_VILLAGE'));
  const enCours   = signalements.filter(s => ['EN_ATTENTE', 'EN_COURS'].includes(s.status));
  const closed    = signalements.filter(s => ['CLOTURE', 'FAUX_SIGNALEMENT'].includes(s.status));

  const filteredList = tab === 'escalated' ? escalated : tab === 'all' ? enCours : closed;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-sos-gray-50">
        <Loader2 className="w-10 h-10 text-sos-blue animate-spin" />
      </div>
    );
  }

  const ov = analytics?.overview || {};

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-sos-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-sos-gray-900">Tableau de bord — Directeur Village</h1>
              <p className="text-sm text-sos-gray-500">
                Supervision & gouvernance · {user.village?.name || user.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData}
                className="p-2 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer" title="Rafraîchir">
                <RefreshCw className="w-4 h-4 text-sos-gray-500" />
              </button>
              <button onClick={handleExport} disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sos-blue text-white text-sm font-medium
                           hover:bg-sos-blue-dark transition disabled:opacity-60 cursor-pointer">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Exporter
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total" value={ov.total ?? 0} icon={BarChart3} color="text-sos-blue" bgLight="bg-sos-blue-light" />
          <StatCard label="En attente" value={ov.enAttente ?? 0} icon={Clock} color="text-yellow-700" bgLight="bg-sos-yellow-light" />
          <StatCard label="En cours" value={ov.enCours ?? 0} icon={Activity} color="text-sos-blue" bgLight="bg-sos-blue-light" />
          <StatCard label="Clôturés" value={ov.cloture ?? 0} icon={CheckCircle2} color="text-sos-green" bgLight="bg-sos-green-light" />
          <StatCard label="Escaladés" value={escalated.length} icon={AlertTriangle} color="text-sos-red" bgLight="bg-sos-red-light" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incident type breakdown */}
          <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
            <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">Types d'incidents</h3>
            <div className="space-y-3">
              {(analytics?.incidentTypeBreakdown || []).map(item => (
                <div key={item._id} className="flex items-center gap-3">
                  <span className="text-sm text-sos-gray-600 w-36 truncate">{INCIDENT_LABELS[item._id] || item._id}</span>
                  <div className="flex-1"><HorizontalBar value={item.count} max={ov.total || 1} /></div>
                  <span className="text-sm font-extrabold text-sos-gray-800 w-8 text-right">{item.count}</span>
                </div>
              ))}
              {(!analytics?.incidentTypeBreakdown || analytics.incidentTypeBreakdown.length === 0) && (
                <p className="text-sm text-sos-gray-400">Aucune donnée</p>
              )}
            </div>
          </div>

          {/* Classification */}
          <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
            <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">Classification</h3>
            <div className="space-y-4">
              {(analytics?.classificationBreakdown || []).map(c => {
                const colors = {
                  SAUVEGARDE:       { bar: 'bg-sos-red', icon: Shield, ic: 'text-sos-red', bg: 'bg-sos-red-light' },
                  PRISE_EN_CHARGE:  { bar: 'bg-sos-blue', icon: Activity, ic: 'text-sos-blue', bg: 'bg-sos-blue-light' },
                  FAUX_SIGNALEMENT: { bar: 'bg-sos-gray-400', icon: FileWarning, ic: 'text-sos-gray-500', bg: 'bg-sos-gray-100' },
                };
                const cfg = colors[c._id] || colors.FAUX_SIGNALEMENT;
                const CIcon = cfg.icon;
                return (
                  <div key={c._id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <CIcon className={`w-4 h-4 ${cfg.ic}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-sos-gray-700 font-medium">{c._id}</span>
                        <span className="text-sm font-extrabold text-sos-gray-800">{c.count}</span>
                      </div>
                      <HorizontalBar value={c.count} max={ov.total || 1} color={cfg.bar} />
                    </div>
                  </div>
                );
              })}
              {(!analytics?.classificationBreakdown || analytics.classificationBreakdown.length === 0) && (
                <p className="text-sm text-sos-gray-400 text-center py-4">Aucune classification</p>
              )}
            </div>
          </div>
        </div>

        {/* Signalements tabs + list */}
        <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card">
          <div className="border-b border-sos-gray-200 px-6 pt-4">
            <div className="flex gap-6">
              {[
                { key: 'escalated', label: 'Escaladés', count: escalated.length },
                { key: 'all',       label: 'En cours',  count: enCours.length },
                { key: 'closed',    label: 'Clôturés',  count: closed.length },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`pb-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                    tab === t.key
                      ? 'border-sos-blue text-sos-blue'
                      : 'border-transparent text-sos-gray-500 hover:text-sos-gray-700'
                  }`}>
                  {t.label} <span className="ml-1 text-xs bg-sos-gray-100 px-2 py-0.5 rounded-full">{t.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {filteredList.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-sos-gray-300 mx-auto mb-3" />
                <p className="text-sos-gray-500">Aucun signalement dans cette catégorie</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredList.map(s => (
                  <SignalementCard key={s._id} item={s} onClick={() => setSelected(s)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <DetailDrawer
          item={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { setSelected(null); fetchData(); }}
        />
      )}
    </div>
  );
}
