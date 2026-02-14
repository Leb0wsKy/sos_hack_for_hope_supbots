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
  ChevronDown,
  Loader2,
  Shield,
  Activity,
  FileWarning,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { getAnalytics, getVillageRatings, exportData } from '../services/api';

/* ═══════════════════════════════════════════════════════
   Helpers
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

const URGENCY_COLOR = {
  FAIBLE: 'bg-sos-green',
  MOYEN: 'bg-sos-yellow',
  ELEVE: 'bg-orange-500',
  CRITIQUE: 'bg-sos-red',
};

const URGENCY_LABEL = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/* ═══════════════════════════════════════════════════════
   Sub-components – Stat Widgets
   ═══════════════════════════════════════════════════════ */

/**
 * StatWidget — Large callout number card.
 * ▸ Uses font-extrabold (800 = XBold) for the number per brand guidelines.
 * ▸ Speech-bubble corners on the card container.
 */
const StatWidget = ({ label, value, icon: Icon, color, bgLight, trend, trendUp }) => (
  <div
    className={`relative overflow-hidden rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-[2rem]
                bg-white border border-sos-gray-200 shadow-card p-6
                hover:shadow-card-hover transition-shadow`}
  >
    {/* Decorative circle */}
    <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${bgLight} opacity-60`} />

    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-sos-gray-500">{label}</p>
        {/* ★ XBold callout number — brand-critical */}
        <p className={`text-4xl mt-1 callout-number ${color}`}>
          {value}
        </p>
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

/* ── Mini bar (horizontal, proportional) ── */
const HorizontalBar = ({ value, max, color = 'bg-sos-blue' }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2.5 bg-sos-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
};

/* ── Village Row ── */
const VillageRow = ({ village, maxCount }) => (
  <div className="flex items-center gap-4 py-3 border-b border-sos-gray-100 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-sos-blue-light flex items-center justify-center shrink-0">
      <Building2 className="w-4 h-4 text-sos-blue" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-sos-gray-800 truncate">{village.villageName || 'Inconnu'}</p>
      <p className="text-xs text-sos-gray-400">{village.location || ''}</p>
    </div>
    <div className="w-32">
      <HorizontalBar value={village.count} max={maxCount} />
    </div>
    <span className="text-sm font-extrabold text-sos-gray-800 w-10 text-right callout-number">
      {village.count}
    </span>
  </div>
);

/* ── Alert Item ── */
const AlertItem = ({ alert }) => (
  <div className="flex items-start gap-3 py-3 border-b border-sos-gray-100 last:border-0">
    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${URGENCY_COLOR[alert.urgencyLevel] || 'bg-sos-gray-300'}`} />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-sos-gray-800 truncate">
        {alert.title || alert.incidentType || 'Signalement'}
      </p>
      <p className="text-xs text-sos-gray-500">
        {alert.village?.name || '—'} · {fmtDate(alert.createdAt)}
      </p>
    </div>
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
      ${alert.urgencyLevel === 'CRITIQUE' ? 'bg-sos-red-light text-sos-red' : 'bg-orange-100 text-orange-700'}`}>
      {URGENCY_LABEL[alert.urgencyLevel]}
    </span>
  </div>
);

/* ── Mini timeline chart (pure CSS) ── */
const TimelineChart = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return <p className="text-sm text-sos-gray-400">Aucune donnée</p>;
  const max = Math.max(...timeline.map((t) => t.count), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {timeline.map((t, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-sos-blue rounded-t-sm transition-all hover:bg-sos-blue-dark"
            style={{ height: `${(t.count / max) * 100}%`, minHeight: t.count > 0 ? '4px' : '0px' }}
            title={`${t._id}: ${t.count}`}
          />
          {i % Math.ceil(timeline.length / 7) === 0 && (
            <span className="text-[10px] text-sos-gray-400 -rotate-45 origin-top-left whitespace-nowrap">
              {fmtDate(t._id)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

/* ── Urgency Donut (CSS only) ── */
const UrgencyDonut = ({ breakdown, total }) => {
  const items = (breakdown || []).map((b) => ({
    key: b._id,
    label: URGENCY_LABEL[b._id] || b._id,
    count: b.count,
    color: URGENCY_COLOR[b._id] || 'bg-sos-gray-300',
  }));

  return (
    <div className="flex items-center gap-6">
      {/* Simple ring */}
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3.5" />
          {(() => {
            let offset = 0;
            return items.map((item) => {
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              const el = (
                <circle
                  key={item.key}
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={
                    item.key === 'CRITIQUE' ? '#E30613' :
                    item.key === 'ELEVE' ? '#F97316' :
                    item.key === 'MOYEN' ? '#FFCC00' :
                    '#00965E'
                  }
                  strokeWidth="3.5"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += pct;
              return el;
            });
          })()}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-extrabold text-sos-gray-800 callout-number">{total}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {items.map((item) => (
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
   Main Dashboard
   ═══════════════════════════════════════════════════════ */
function DashboardLevel3() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      const { data } = await getAnalytics(params);
      setAnalytics(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await exportData(dateRange);
      // Backend returns JSON — convert to CSV for download
      const records = data.data || [];
      if (records.length === 0) {
        setExporting(false);
        return;
      }
      const headers = Object.keys(records[0]);
      const csvRows = [
        headers.join(','),
        ...records.map((r) =>
          headers.map((h) => {
            const val = r[h];
            if (val === null || val === undefined) return '';
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          }).join(',')
        ),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-sos-gray-50">
        <Loader2 className="w-10 h-10 text-sos-blue animate-spin" />
      </div>
    );
  }

  const ov = analytics?.overview || {};
  const byVillage = analytics?.byVillage || [];
  const villageMax = Math.max(...byVillage.map((v) => v.count), 1);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50 pb-12">
      {/* ── Header ── */}
      <div className="bg-white border-b border-sos-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-sos-gray-900">Gouvernance & Analyse</h1>
              <p className="text-sm text-sos-gray-500">Vue d'ensemble nationale</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-sos-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sos-blue/40"
              />
              <span className="text-sos-gray-400 text-sm">→</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-sos-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sos-blue/40"
              />
              <button
                onClick={fetchData}
                className="p-2 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4 text-sos-gray-500" />
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sos-blue text-white text-sm font-medium
                           hover:bg-sos-blue-dark transition disabled:opacity-60 cursor-pointer"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Exporter
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ═══ Row 1: Large Stat Widgets ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatWidget
            label="Total signalements"
            value={ov.total ?? 0}
            icon={BarChart3}
            color="text-sos-blue"
            bgLight="bg-sos-blue-light"
          />
          <StatWidget
            label="En attente"
            value={ov.enAttente ?? 0}
            icon={Clock}
            color="text-yellow-700"
            bgLight="bg-sos-yellow-light"
          />
          <StatWidget
            label="En cours"
            value={ov.enCours ?? 0}
            icon={Activity}
            color="text-sos-blue"
            bgLight="bg-sos-blue-light"
          />
          <StatWidget
            label="Clôturés"
            value={ov.cloture ?? 0}
            icon={CheckCircle2}
            color="text-sos-green"
            bgLight="bg-sos-green-light"
          />
        </div>

        {/* Additional stat row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatWidget
            label="Faux signalements"
            value={ov.fauxSignalements ?? 0}
            icon={FileWarning}
            color="text-sos-gray-500"
            bgLight="bg-sos-gray-100"
            trend={`${ov.fauxSignalementsRate ?? 0}%`}
            trendUp={Number(ov.fauxSignalementsRate) > 10}
          />
          <StatWidget
            label="Utilisateurs"
            value={analytics?.users?.total ?? 0}
            icon={Users}
            color="text-sos-brown"
            bgLight="bg-sos-brown-light"
          />
          <StatWidget
            label="Villages actifs"
            value={byVillage.length}
            icon={MapPin}
            color="text-sos-green"
            bgLight="bg-sos-green-light"
          />
        </div>

        {/* ═══ Row 2: Charts ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Urgency Donut */}
          <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
            <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">
              Répartition par urgence
            </h3>
            <UrgencyDonut breakdown={analytics?.urgencyBreakdown} total={ov.total ?? 0} />
          </div>

          {/* Timeline */}
          <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
            <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">
              Tendance (30 jours)
            </h3>
            <TimelineChart timeline={analytics?.timeline} />
          </div>
        </div>

        {/* ═══ Row 3: Incident Types + Village breakdown ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incident types */}
          <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
            <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">
              Types d'incidents
            </h3>
            <div className="space-y-3">
              {(analytics?.incidentTypeBreakdown || []).map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <span className="text-sm text-sos-gray-600 w-36 truncate">
                    {INCIDENT_LABELS[item._id] || item._id}
                  </span>
                  <div className="flex-1">
                    <HorizontalBar value={item.count} max={ov.total || 1} color="bg-sos-blue" />
                  </div>
                  <span className="text-sm font-extrabold text-sos-gray-800 w-8 text-right callout-number">
                    {item.count}
                  </span>
                </div>
              ))}
              {(!analytics?.incidentTypeBreakdown || analytics.incidentTypeBreakdown.length === 0) && (
                <p className="text-sm text-sos-gray-400">Aucune donnée</p>
              )}
            </div>
          </div>

          {/* By Village — speech-bubble card */}
          <div
            className="bg-white border border-sos-gray-200 shadow-card p-6
                        rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-[2rem]"
          >
            <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">
              Signalements par village
            </h3>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {byVillage.length === 0 && (
                <p className="text-sm text-sos-gray-400">Aucune donnée</p>
              )}
              {byVillage.map((v) => (
                <VillageRow key={v._id} village={v} maxCount={villageMax} />
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Row 4: Recent Alerts + Classification ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent high-priority */}
          <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide">
                Alertes prioritaires
              </h3>
              <AlertTriangle className="w-4 h-4 text-sos-red" />
            </div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              {(analytics?.recentAlerts || []).length === 0 && (
                <p className="text-sm text-sos-gray-400 text-center py-8">Aucune alerte</p>
              )}
              {(analytics?.recentAlerts || []).map((a) => (
                <AlertItem key={a._id} alert={a} />
              ))}
            </div>
          </div>

          {/* Classification breakdown */}
          <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card p-6">
            <h3 className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-4">
              Classification
            </h3>
            <div className="space-y-4">
              {(analytics?.classificationBreakdown || []).map((c) => {
                const colors = {
                  SAUVEGARDE: { bar: 'bg-sos-red', icon: Shield, iconColor: 'text-sos-red', bg: 'bg-sos-red-light' },
                  PRISE_EN_CHARGE: { bar: 'bg-sos-blue', icon: Activity, iconColor: 'text-sos-blue', bg: 'bg-sos-blue-light' },
                  FAUX_SIGNALEMENT: { bar: 'bg-sos-gray-400', icon: FileWarning, iconColor: 'text-sos-gray-500', bg: 'bg-sos-gray-100' },
                };
                const cfg = colors[c._id] || colors.FAUX_SIGNALEMENT;
                const CIcon = cfg.icon;

                return (
                  <div key={c._id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <CIcon className={`w-4 h-4 ${cfg.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-sos-gray-700 font-medium">{c._id}</span>
                        <span className="text-sm font-extrabold text-sos-gray-800 callout-number">{c.count}</span>
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

        {/* ═══ Row 5: User breakdown (small callout cards) ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Déclarants (L1)', value: analytics?.users?.level1 ?? 0, icon: Users, color: 'text-sos-blue', bg: 'bg-sos-blue-light' },
            { label: 'Analystes (L2)', value: analytics?.users?.level2 ?? 0, icon: Activity, color: 'text-sos-green', bg: 'bg-sos-green-light' },
            { label: 'Gouvernance (L3)', value: analytics?.users?.level3 ?? 0, icon: Shield, color: 'text-sos-brown', bg: 'bg-sos-brown-light' },
          ].map((u) => (
            <div key={u.label} className="bg-white border border-sos-gray-200 rounded-xl shadow-card px-5 py-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${u.bg} flex items-center justify-center`}>
                <u.icon className={`w-5 h-5 ${u.color}`} />
              </div>
              <div>
                <p className="text-xs text-sos-gray-500">{u.label}</p>
                <p className={`text-2xl font-extrabold ${u.color} callout-number`}>{u.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardLevel3;
