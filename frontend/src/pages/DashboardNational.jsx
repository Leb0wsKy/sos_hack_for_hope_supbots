import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Download,
  RefreshCw,
  Loader2,
  Shield,
  Activity,
  FileWarning,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Eye,
  FileText,
  Archive,
  ChevronRight,
} from 'lucide-react';
import {
  getAnalytics,
  getVillageRatings,
  getSignalements,
  closeSignalement,
  archiveSignalement,
  exportData,
  downloadAttachment,
} from '../services/api';

/* ═══════════════════════════════════════════════════════
   Constants & Helpers
   ═══════════════════════════════════════════════════════ */
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

const URGENCY_COLOR = { FAIBLE: 'bg-sos-green', MOYEN: 'bg-sos-yellow', ELEVE: 'bg-orange-500', CRITIQUE: 'bg-sos-red' };
const URGENCY_LABEL = { FAIBLE: 'Faible', MOYEN: 'Moyen', ELEVE: 'Élevé', CRITIQUE: 'Critique' };

const STATUS_MAP = {
  EN_ATTENTE:       { label: 'En attente',       color: 'text-yellow-700',    bg: 'bg-sos-yellow-light' },
  EN_COURS:         { label: 'En cours',          color: 'text-sos-blue',      bg: 'bg-sos-blue-light' },
  CLOTURE:          { label: 'Clôturé',           color: 'text-sos-green',     bg: 'bg-sos-green-light' },
  FAUX_SIGNALEMENT: { label: 'Faux signalement',  color: 'text-sos-gray-500', bg: 'bg-sos-gray-100' },
};

const URGENCY_BADGES = {
  FAIBLE:   { bg: 'bg-sos-green-light', text: 'text-sos-green', dot: 'bg-sos-green' },
  MOYEN:    { bg: 'bg-sos-yellow-light', text: 'text-yellow-700', dot: 'bg-sos-yellow' },
  ELEVE:    { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  CRITIQUE: { bg: 'bg-sos-red-light', text: 'text-sos-red', dot: 'bg-sos-red' },
};

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/* ═══════════════════════════════════════════════════════
   Reusable Sub-components
   ═══════════════════════════════════════════════════════ */
const StatWidget = ({ label, value, icon: Icon, color, bgLight, trend, trendUp }) => (
  <div className="relative overflow-hidden rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-[2rem]
                  bg-white border border-sos-gray-200 shadow-card p-6 hover:shadow-card-hover transition-shadow">
    <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${bgLight} opacity-60`} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-sos-gray-500">{label}</p>
        <p className={`text-4xl mt-1 font-extrabold ${color}`}>{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trendUp ? 'text-sos-red' : 'text-sos-green'}`}>
            {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend}
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-2xl ${bgLight} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color}`} />
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

const VillageRow = ({ village, maxCount }) => (
  <div className="flex items-center gap-4 py-3 border-b border-sos-gray-100 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-sos-blue-light flex items-center justify-center shrink-0">
      <Building2 className="w-4 h-4 text-sos-blue" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-sos-gray-800 truncate">{village.villageName || 'Inconnu'}</p>
      <p className="text-xs text-sos-gray-400">{village.location || ''}</p>
    </div>
    <div className="w-32"><HorizontalBar value={village.count} max={maxCount} /></div>
    <span className="text-sm font-extrabold text-sos-gray-800 w-10 text-right">{village.count}</span>
  </div>
);

const TimelineChart = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return <p className="text-sm text-sos-gray-400">Aucune donnée</p>;
  const max = Math.max(...timeline.map(t => t.count), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {timeline.map((t, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-sos-blue rounded-t-sm transition-all hover:bg-sos-blue-dark"
               style={{ height: `${(t.count / max) * 100}%`, minHeight: t.count > 0 ? '4px' : '0px' }}
               title={`${t._id}: ${t.count}`} />
          {i % Math.ceil(timeline.length / 7) === 0 && (
            <span className="text-[10px] text-sos-gray-400 -rotate-45 origin-top-left whitespace-nowrap">
              {fmtShort(t._id)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

const UrgencyDonut = ({ breakdown, total }) => {
  const items = (breakdown || []).map(b => ({
    key: b._id, label: URGENCY_LABEL[b._id] || b._id, count: b.count, color: URGENCY_COLOR[b._id] || 'bg-sos-gray-300',
  }));
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3.5" />
          {(() => {
            let offset = 0;
            return items.map(item => {
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              const el = (
                <circle key={item.key} cx="18" cy="18" r="15.9" fill="none"
                  stroke={item.key === 'CRITIQUE' ? '#E30613' : item.key === 'ELEVE' ? '#F97316' : item.key === 'MOYEN' ? '#FFCC00' : '#00965E'}
                  strokeWidth="3.5" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-offset} />
              );
              offset += pct;
              return el;
            });
          })()}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-extrabold text-sos-gray-800">{total}</span>
        </div>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.key} className="flex items-center gap-2 text-sm">
            <span className={`w-3 h-3 rounded-full ${item.color}`} />
            <span className="text-sos-gray-600">{item.label}</span>
            <span className="font-bold text-sos-gray-800 ml-auto">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Signalement Card (compact)
   ═══════════════════════════════════════════════════════ */
const SignalementCard = ({ item, onClick }) => {
  const urg = URGENCY_BADGES[item.urgencyLevel] || URGENCY_BADGES.FAIBLE;
  const st = STATUS_MAP[item.status] || STATUS_MAP.EN_ATTENTE;
  return (
    <div onClick={onClick}
      className="bg-white border border-sos-gray-200 rounded-xl p-4 hover:shadow-card-hover transition-all cursor-pointer group">
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${urg.bg} ${urg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />{URGENCY_LABEL[item.urgencyLevel]}
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
      <h4 className="text-sm font-semibold text-sos-gray-800 mb-1 line-clamp-1">{item.title || item.incidentType}</h4>
      <p className="text-xs text-sos-gray-500 mb-2 line-clamp-1">{item.village?.name || '—'}</p>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
        <ChevronRight className="w-4 h-4 text-sos-gray-300 group-hover:text-sos-blue transition" />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Detail Drawer
   ═══════════════════════════════════════════════════════ */
const DetailDrawer = ({ item, onClose, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  if (!item) return null;

  const urg = URGENCY_BADGES[item.urgencyLevel] || URGENCY_BADGES.FAIBLE;
  const st = STATUS_MAP[item.status] || STATUS_MAP.EN_ATTENTE;

  const handleClose = async () => {
    const reason = prompt('Raison de la clôture :');
    if (!reason) return;
    setActionLoading('close');
    try { await closeSignalement(item._id, reason); alert('✅ Signalement clôturé.'); onRefresh(); }
    catch (err) { alert(err.response?.data?.message || 'Erreur.'); }
    setActionLoading('');
  };

  const handleArchive = async () => {
    if (!confirm('Archiver ce signalement ?')) return;
    setActionLoading('archive');
    try { await archiveSignalement(item._id); alert('✅ Archivé.'); onRefresh(); }
    catch (err) { alert(err.response?.data?.message || 'Erreur.'); }
    setActionLoading('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-white border-b border-sos-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-sos-gray-900">Détail du signalement</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer">
            <X className="w-5 h-5 text-sos-gray-600" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${urg.bg} ${urg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />{URGENCY_LABEL[item.urgencyLevel]}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
            {item.escalated && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sos-red-light text-sos-red">⚠ Escaladé</span>}
          </div>

          <div>
            <h3 className="text-xl font-bold text-sos-gray-900">{item.title || item.incidentType}</h3>
            <p className="text-sm text-sos-gray-500 mt-1">{item.village?.name || '—'} · {INCIDENT_LABELS[item.incidentType] || item.incidentType} · {fmtDate(item.createdAt)}</p>
          </div>

          {item.description && <div className="bg-sos-gray-50 rounded-xl p-4"><p className="text-sm text-sos-gray-700 leading-relaxed">{item.description}</p></div>}

          <div className="grid grid-cols-2 gap-4">
            {item.childName && <div><p className="text-sos-gray-400 text-xs mb-0.5">Enfant</p><p className="font-medium text-sos-gray-800">{item.childName}</p></div>}
            {item.childAge && <div><p className="text-sos-gray-400 text-xs mb-0.5">Âge</p><p className="font-medium text-sos-gray-800">{item.childAge} ans</p></div>}
            {item.abuserName && <div><p className="text-sos-gray-400 text-xs mb-0.5">Agresseur présumé</p><p className="font-medium text-sos-gray-800">{item.abuserName}</p></div>}
            {item.createdBy && <div><p className="text-sos-gray-400 text-xs mb-0.5">Déclarant</p><p className="font-medium text-sos-gray-800">{item.createdBy?.name || '—'}</p></div>}
            {item.assignedTo && <div><p className="text-sos-gray-400 text-xs mb-0.5">Assigné à</p><p className="font-medium text-sos-gray-800">{item.assignedTo?.name || '—'}</p></div>}
            {item.classification && <div><p className="text-sos-gray-400 text-xs mb-0.5">Classification</p><p className="font-medium text-sos-gray-800">{item.classification}</p></div>}
          </div>

          {item.escalated && item.escalationNote && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-sos-red uppercase tracking-wide mb-1">Note d'escalade</p>
              <p className="text-sm text-sos-gray-700">{item.escalationNote}</p>
              {item.escalatedAt && <p className="text-[10px] text-sos-gray-400 mt-2">Escaladé le {fmtDate(item.escalatedAt)}</p>}
            </div>
          )}

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
                            setPreviewFile({ url: URL.createObjectURL(new Blob([data], { type: mime })), name: a.originalName || a.filename, type: mime });
                          } catch { alert('Erreur.'); }
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
                        } catch { alert('Erreur.'); }
                      }} className="p-1 rounded hover:bg-sos-blue-light transition cursor-pointer">
                        <Download className="w-4 h-4 text-sos-blue" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {item.status === 'CLOTURE' && item.closedAt && (
            <div className="bg-sos-green-light border border-green-200 rounded-xl p-4">
              <p className="text-xs font-bold text-sos-green uppercase tracking-wide mb-1">Clôturé</p>
              <p className="text-sm text-sos-gray-700">{item.closureReason || '—'}</p>
              <p className="text-[10px] text-sos-gray-400 mt-1">Le {fmtDate(item.closedAt)}</p>
            </div>
          )}

          <div className="pt-4 border-t border-sos-gray-200 space-y-2">
            {item.status === 'EN_COURS' && (
              <button onClick={handleClose} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sos-green text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60 cursor-pointer">
                {actionLoading === 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Clôturer
              </button>
            )}
            {item.status === 'CLOTURE' && !item.isArchived && (
              <button onClick={handleArchive} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sos-gray-200 text-sos-gray-700 text-sm font-semibold hover:bg-sos-gray-300 transition disabled:opacity-60 cursor-pointer">
                {actionLoading === 'archive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                Archiver
              </button>
            )}
          </div>
        </div>
      </div>

      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
             onClick={() => { URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-sos-gray-200">
              <span className="text-sm font-semibold text-sos-gray-800 truncate">{previewFile.name}</span>
              <button onClick={() => { URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}
                      className="p-1.5 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer"><X className="w-5 h-5 text-sos-gray-600" /></button>
            </div>
            <div className="flex-1 overflow-auto p-2 bg-sos-gray-50 flex items-center justify-center">
              {previewFile.type === 'application/pdf'
                ? <iframe src={previewFile.url} className="w-full h-full rounded-lg" title={previewFile.name} />
                : <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Main Dashboard — Responsable National Sauvegarde
   ═══════════════════════════════════════════════════════ */
export default function DashboardNational() {
  const [analytics, setAnalytics] = useState(null);
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeView, setActiveView] = useState('analytics'); // analytics | escalated | all
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      const [analyticsRes, signalementsRes] = await Promise.all([
        getAnalytics(params),
        getSignalements(),
      ]);
      setAnalytics(analyticsRes.data);
      const list = Array.isArray(signalementsRes.data) ? signalementsRes.data : signalementsRes.data.signalements || [];
      setSignalements(list);
    } catch { /* */ }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await exportData(dateRange);
      const records = data.data || [];
      if (records.length === 0) { setExporting(false); return; }
      const headers = Object.keys(records[0]);
      const csvRows = [headers.join(','), ...records.map(r => headers.map(h => {
        const val = r[h]; if (val == null) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(','))];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `export-national-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /* */ }
    setExporting(false);
  };

  const escalated = signalements.filter(s => s.escalated);
  const allActive = signalements.filter(s => ['EN_ATTENTE', 'EN_COURS'].includes(s.status));

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-sos-gray-50">
        <Loader2 className="w-10 h-10 text-sos-blue animate-spin" />
      </div>
    );
  }

  const ov = analytics?.overview || {};
  const byVillage = analytics?.byVillage || [];
  const villageMax = Math.max(...byVillage.map(v => v.count), 1);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-sos-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-sos-gray-900">Responsable National — Sauvegarde</h1>
              <p className="text-sm text-sos-gray-500">Vue d'ensemble nationale · Tous les villages</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={dateRange.startDate}
                onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-sos-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sos-blue/40" />
              <span className="text-sos-gray-400 text-sm">→</span>
              <input type="date" value={dateRange.endDate}
                onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-sos-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sos-blue/40" />
              <button onClick={fetchData} className="p-2 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer" title="Rafraîchir">
                <RefreshCw className="w-4 h-4 text-sos-gray-500" />
              </button>
              <button onClick={handleExport} disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sos-blue text-white text-sm font-medium hover:bg-sos-blue-dark transition disabled:opacity-60 cursor-pointer">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Exporter
              </button>
            </div>
          </div>

          {/* View switcher */}
          <div className="flex gap-6 mt-4">
            {[
              { key: 'analytics', label: 'Analyse' },
              { key: 'escalated', label: `Escaladés (${escalated.length})` },
              { key: 'all', label: `Signalements actifs (${allActive.length})` },
            ].map(v => (
              <button key={v.key} onClick={() => setActiveView(v.key)}
                className={`pb-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                  activeView === v.key ? 'border-sos-blue text-sos-blue' : 'border-transparent text-sos-gray-500 hover:text-sos-gray-700'
                }`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeView === 'analytics' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatWidget label="Total signalements" value={ov.total ?? 0} icon={BarChart3} color="text-sos-blue" bgLight="bg-sos-blue-light" />
              <StatWidget label="En attente" value={ov.enAttente ?? 0} icon={Clock} color="text-yellow-700" bgLight="bg-sos-yellow-light" />
              <StatWidget label="En cours" value={ov.enCours ?? 0} icon={Activity} color="text-sos-blue" bgLight="bg-sos-blue-light" />
              <StatWidget label="Clôturés" value={ov.cloture ?? 0} icon={CheckCircle2} color="text-sos-green" bgLight="bg-sos-green-light" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatWidget label="Faux signalements" value={ov.fauxSignalements ?? 0} icon={FileWarning} color="text-sos-gray-500" bgLight="bg-sos-gray-100"
                trend={`${ov.fauxSignalementsRate ?? 0}%`} trendUp={Number(ov.fauxSignalementsRate) > 10} />
              <StatWidget label="Utilisateurs" value={analytics?.users?.total ?? 0} icon={Users} color="text-sos-brown" bgLight="bg-sos-brown-light" />
              <StatWidget label="Villages actifs" value={byVillage.length} icon={MapPin} color="text-sos-green" bgLight="bg-sos-green-light" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
                <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">Répartition par urgence</h3>
                <UrgencyDonut breakdown={analytics?.urgencyBreakdown} total={ov.total ?? 0} />
              </div>
              <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
                <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">Tendance (30 jours)</h3>
                <TimelineChart timeline={analytics?.timeline} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Incident types */}
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
                </div>
              </div>

              {/* By Village */}
              <div className="bg-white border border-sos-gray-200 shadow-card p-6 rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-[2rem]">
                <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">Signalements par village</h3>
                <div className="max-h-80 overflow-y-auto">
                  {byVillage.map(v => <VillageRow key={v._id} village={v} maxCount={villageMax} />)}
                  {byVillage.length === 0 && <p className="text-sm text-sos-gray-400">Aucune donnée</p>}
                </div>
              </div>
            </div>

            {/* Classification + alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide">Alertes prioritaires</h3>
                  <AlertTriangle className="w-4 h-4 text-sos-red" />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {(analytics?.recentAlerts || []).length === 0 && <p className="text-sm text-sos-gray-400 text-center py-8">Aucune alerte</p>}
                  {(analytics?.recentAlerts || []).map(a => (
                    <div key={a._id} className="flex items-start gap-3 py-3 border-b border-sos-gray-100 last:border-0">
                      <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${URGENCY_COLOR[a.urgencyLevel] || 'bg-sos-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-sos-gray-800 truncate">{a.title || a.incidentType}</p>
                        <p className="text-xs text-sos-gray-500">{a.village?.name || '—'} · {fmtShort(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
                <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">Classification</h3>
                <div className="space-y-4">
                  {(analytics?.classificationBreakdown || []).map(c => {
                    const colors = {
                      SAUVEGARDE: { bar: 'bg-sos-red', icon: Shield, ic: 'text-sos-red', bg: 'bg-sos-red-light' },
                      PRISE_EN_CHARGE: { bar: 'bg-sos-blue', icon: Activity, ic: 'text-sos-blue', bg: 'bg-sos-blue-light' },
                      FAUX_SIGNALEMENT: { bar: 'bg-sos-gray-400', icon: FileWarning, ic: 'text-sos-gray-500', bg: 'bg-sos-gray-100' },
                    };
                    const cfg = colors[c._id] || colors.FAUX_SIGNALEMENT;
                    const CIcon = cfg.icon;
                    return (
                      <div key={c._id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}><CIcon className={`w-4 h-4 ${cfg.ic}`} /></div>
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
                </div>
              </div>
            </div>

            {/* User breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Déclarants (L1)', value: analytics?.users?.level1 ?? 0, icon: Users, color: 'text-sos-blue', bg: 'bg-sos-blue-light' },
                { label: 'Analystes (L2)', value: analytics?.users?.level2 ?? 0, icon: Activity, color: 'text-sos-green', bg: 'bg-sos-green-light' },
                { label: 'Gouvernance (L3)', value: analytics?.users?.level3 ?? 0, icon: Shield, color: 'text-sos-brown', bg: 'bg-sos-brown-light' },
              ].map(u => (
                <div key={u.label} className="bg-white border border-sos-gray-200 rounded-xl shadow-card px-5 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${u.bg} flex items-center justify-center`}><u.icon className={`w-5 h-5 ${u.color}`} /></div>
                  <div>
                    <p className="text-xs text-sos-gray-500">{u.label}</p>
                    <p className={`text-2xl font-extrabold ${u.color}`}>{u.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Escalated view */}
        {activeView === 'escalated' && (
          <div>
            {escalated.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-16 h-16 text-sos-gray-300 mx-auto mb-4" />
                <p className="text-lg text-sos-gray-500">Aucun signalement escaladé</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {escalated.map(s => <SignalementCard key={s._id} item={s} onClick={() => setSelected(s)} />)}
              </div>
            )}
          </div>
        )}

        {/* All active view */}
        {activeView === 'all' && (
          <div>
            {allActive.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-16 h-16 text-sos-gray-300 mx-auto mb-4" />
                <p className="text-lg text-sos-gray-500">Aucun signalement actif</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allActive.map(s => <SignalementCard key={s._id} item={s} onClick={() => setSelected(s)} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <DetailDrawer item={selected} onClose={() => setSelected(null)}
          onRefresh={() => { setSelected(null); fetchData(); }} />
      )}
    </div>
  );
}
