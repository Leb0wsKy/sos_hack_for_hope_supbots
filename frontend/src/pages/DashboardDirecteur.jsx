import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Shield,
  FileWarning,
  RefreshCw,
  Download,
  Loader2,
  X,
  Eye,
  FileText,
  Archive,
  ChevronRight,
  PenTool,
  Send,
  Upload,
  Stamp,
  FileCheck,
} from 'lucide-react';
import { Toast, useToast } from '../components/Toast';
import {
  getAnalytics,
  getSignalements,
  archiveSignalement,
  exportData,
  downloadAttachment,
  downloadWorkflowAttachment,
  directorSignDossier,
  directorForwardDossier,
  getDPEDraft,
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

const DIRECTOR_STATUS = {
  PENDING:   { label: 'En attente de signature', color: 'text-yellow-700', bg: 'bg-sos-yellow-light', icon: Clock },
  SIGNED:    { label: 'Signé',                   color: 'text-sos-blue',   bg: 'bg-sos-blue-light',   icon: PenTool },
  FORWARDED: { label: 'Envoyé au national',      color: 'text-sos-green',  bg: 'bg-sos-green-light',  icon: Send },
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

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';

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
   Signalement Detail Drawer with Signing
   ═══════════════════════════════════════════════════════ */
const DetailDrawer = ({ item, onClose, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [signTarget, setSignTarget] = useState(null); // null | 'FICHE_INITIALE' | 'RAPPORT_DPE'
  const [signMode, setSignMode] = useState(null); // null | 'STAMP' | 'IMAGE'
  const [sigImage, setSigImage] = useState(null);
  const [dpeContent, setDpeContent] = useState(null);
  const [toast, showToast, dismissToast] = useToast();

  if (!item) return null;

  const urg = URGENCY[item.urgencyLevel] || URGENCY.FAIBLE;
  const st = STATUS_MAP[item.status] || STATUS_MAP.EN_ATTENTE;
  const ds = DIRECTOR_STATUS[item.directorReviewStatus] || null;

  const hasDpeFinal = !!item.reports?.dpeFinal?.metadata?.submittedAt;
  const wf = item.workflowRef || item.workflow;
  const stages = wf?.stages || {};

  // Signature state
  const ficheSigned = !!item.directorSignatures?.ficheInitiale?.signedAt;
  const dpeSigned = !!item.directorSignatures?.rapportDpe?.signedAt;
  const bothSigned = ficheSigned && dpeSigned;
  const canSign = ['PENDING', 'PARTIALLY_SIGNED'].includes(item.directorReviewStatus);
  const canForward = bothSigned && item.directorReviewStatus === 'SIGNED';

  const STAGE_LABELS = {
    ficheInitiale: 'Fiche Initiale',
    rapportDpe: 'Rapport DPE',
    evaluationComplete: 'Évaluation Complète',
    planAction: 'Plan d\'Action',
    rapportSuivi: 'Rapport de Suivi',
    rapportFinal: 'Rapport Final',
  };

  /* ── Actions ── */
  const handleSign = async (type) => {
    if (!signTarget) return;
    setActionLoading('sign');
    try {
      await directorSignDossier(item._id, type, signTarget, type === 'IMAGE' ? sigImage : null);
      const label = signTarget === 'FICHE_INITIALE' ? 'Fiche Initiale' : 'Rapport DPE';
      showToast('success', `${label} signé avec succès.`);
      setSignMode(null);
      setSignTarget(null);
      setSigImage(null);
      onRefresh();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Erreur lors de la signature.');
    }
    setActionLoading('');
  };

  const handleForward = async () => {
    if (!confirm('Envoyer ce dossier signé au Responsable National de Sauvegarde ?')) return;
    setActionLoading('forward');
    try {
      await directorForwardDossier(item._id);
      showToast('success', 'Dossier envoyé au Responsable National.');
      onRefresh();
    } catch (err) {
      showToast('error', err.response?.data?.message || "Erreur lors de l'envoi.");
    }
    setActionLoading('');
  };

  const handleArchive = async () => {
    if (!confirm('Archiver ce signalement ?')) return;
    setActionLoading('archive');
    try {
      await archiveSignalement(item._id);
      showToast('success', 'Signalement archivé.');
      onRefresh();
    } catch (err) {
      showToast('error', err.response?.data?.message || "Erreur lors de l'archivage.");
    }
    setActionLoading('');
  };

  const loadDpe = async () => {
    try {
      const { data } = await getDPEDraft(item._id);
      setDpeContent(data.draft || data.content || data);
    } catch { /* */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-sos-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-sos-gray-900">Détail du dossier</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer">
            <X className="w-5 h-5 text-sos-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${urg.bg} ${urg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} /> {urg.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>
              {st.label}
            </span>
            {ds && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${ds.bg} ${ds.color}`}>
                <ds.icon className="w-3 h-3" /> {ds.label}
              </span>
            )}
          </div>

          {/* Title */}
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
            {item.childName && <div><p className="text-sos-gray-400 text-xs mb-0.5">Enfant</p><p className="font-medium text-sos-gray-800">{item.childName}</p></div>}
            {item.createdBy ? <div><p className="text-sos-gray-400 text-xs mb-0.5">Déclarant</p><p className="font-medium text-sos-gray-800">{item.createdBy?.name || '—'}</p></div>
              : item.isAnonymous && <div><p className="text-sos-gray-400 text-xs mb-0.5">Déclarant</p><p className="font-medium text-amber-600 italic">Anonyme</p></div>}
            {item.assignedTo && <div><p className="text-sos-gray-400 text-xs mb-0.5">Psychologue</p><p className="font-medium text-sos-gray-800">{item.assignedTo?.name || '—'}</p></div>}
            {item.classification && <div><p className="text-sos-gray-400 text-xs mb-0.5">Classification</p><p className="font-medium text-sos-gray-800">{item.classification}</p></div>}
          </div>

          {/* ── ALL Documents from Workflow ── */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide">Documents du dossier</p>

            {/* Workflow stage files */}
            {Object.entries(stages).map(([stageKey, stageData]) => {
              if (!stageData?.completed && !stageData?.attachments?.length) return null;
              const label = STAGE_LABELS[stageKey] || stageKey;
              const isFiche = stageKey === 'ficheInitiale';
              const isDpe = stageKey === 'rapportDpe';
              const signed = isFiche ? ficheSigned : isDpe ? dpeSigned : false;
              const signable = isFiche || isDpe;

              return (
                <div key={stageKey} className={`rounded-xl p-4 space-y-2 border ${
                  signable ? (signed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200') : 'bg-sos-gray-50 border-sos-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${signed ? 'text-sos-green' : signable ? 'text-amber-600' : 'text-sos-blue'}`} />
                      <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide">{label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {stageData?.completed && (
                        <span className="text-[10px] text-sos-green font-medium">✓ Complété {stageData.completedAt ? fmtDate(stageData.completedAt) : ''}</span>
                      )}
                      {signed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sos-green-light text-sos-green">
                          <PenTool className="w-3 h-3" /> Signé
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stage attachments */}
                  {stageData?.attachments?.length > 0 && (
                    <div className="space-y-1.5">
                      {stageData.attachments.map((a, i) => {
                        const mime = a.mimeType || '';
                        const canPreview = mime.startsWith('image/') || mime === 'application/pdf';
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border border-sos-gray-200">
                            <FileText className="w-4 h-4 text-sos-blue shrink-0" />
                            <span className="truncate flex-1 text-sos-gray-700">{a.originalName || a.filename}</span>
                            {canPreview && (
                              <button title="Aperçu" onClick={async () => {
                                try {
                                  const { data } = wf?._id
                                    ? await downloadWorkflowAttachment(wf._id, stageKey, a.filename)
                                    : await downloadAttachment(item._id, a.filename);
                                  const blob = new Blob([data], { type: mime });
                                  setPreviewFile({ url: URL.createObjectURL(blob), name: a.originalName || a.filename, type: mime });
                                } catch { showToast('error', 'Erreur lors de l\'aperçu.'); }
                              }} className="p-1 rounded hover:bg-sos-blue-light transition cursor-pointer">
                                <Eye className="w-4 h-4 text-sos-blue" />
                              </button>
                            )}
                            <button title="Télécharger" onClick={async () => {
                              try {
                                const { data } = wf?._id
                                  ? await downloadWorkflowAttachment(wf._id, stageKey, a.filename)
                                  : await downloadAttachment(item._id, a.filename);
                                const url = URL.createObjectURL(new Blob([data]));
                                const link = document.createElement('a'); link.href = url;
                                link.setAttribute('download', a.originalName || a.filename);
                                document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
                              } catch { showToast('error', 'Erreur lors du téléchargement.'); }
                            }} className="p-1 rounded hover:bg-sos-blue-light transition cursor-pointer">
                              <Download className="w-4 h-4 text-sos-blue" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* DPE Report content viewer */}
                  {isDpe && hasDpeFinal && (
                    <div className="mt-1">
                      <button onClick={loadDpe}
                        className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border border-sos-gray-200
                                   hover:bg-sos-blue-light transition cursor-pointer w-full">
                        <FileCheck className="w-4 h-4 text-sos-green shrink-0" />
                        <span className="text-sos-gray-700">Voir le rapport DPE Final</span>
                        <Eye className="w-4 h-4 text-sos-blue ml-auto" />
                      </button>
                      {dpeContent && (
                        <div className="mt-2 bg-white border border-sos-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto text-xs text-sos-gray-700 space-y-2">
                          {dpeContent.titre && <p className="font-bold text-sm">{dpeContent.titre}</p>}
                          {dpeContent.resume_signalement && <p><span className="font-semibold">Résumé :</span> {dpeContent.resume_signalement}</p>}
                          {dpeContent.observations && <p><span className="font-semibold">Observations :</span> {dpeContent.observations}</p>}
                          {dpeContent.evaluation_risque?.niveau && (
                            <p><span className="font-semibold">Risque :</span> {dpeContent.evaluation_risque.niveau} — {dpeContent.evaluation_risque.justification}</p>
                          )}
                          {dpeContent.recommandations?.length > 0 && (
                            <div><span className="font-semibold">Recommandations :</span>
                              <ul className="list-disc ml-4 mt-1">{dpeContent.recommandations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Signature display for signed docs */}
                  {signable && signed && (() => {
                    const sig = isFiche ? item.directorSignatures?.ficheInitiale : item.directorSignatures?.rapportDpe;
                    return (
                      <div className="border-t border-green-200 pt-2 mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <PenTool className="w-3.5 h-3.5 text-sos-green" />
                          <p className="text-[10px] font-bold text-sos-green uppercase">Signature électronique</p>
                        </div>
                        {sig?.signatureType === 'STAMP' ? (
                          <div className="bg-white border border-dashed border-sos-green rounded-lg p-2 text-center">
                            <p className="text-xs font-mono text-sos-gray-700 whitespace-pre-line">{sig.signatureData}</p>
                          </div>
                        ) : (
                          <div className="bg-white border border-sos-gray-200 rounded-lg p-2 flex justify-center">
                            <img src={`http://localhost:5000/uploads/${sig?.signatureData}`} alt="Signature" className="max-h-16 object-contain"
                              onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                        <p className="text-[10px] text-sos-gray-400 mt-1">
                          Signé le {fmtDate(sig?.signedAt)} par {sig?.signedBy?.name || 'Directeur'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Sign button for unsigned signable docs */}
                  {signable && !signed && canSign && (
                    <div className="pt-2">
                      {signTarget !== (isFiche ? 'FICHE_INITIALE' : 'RAPPORT_DPE') ? (
                        <button onClick={() => { setSignTarget(isFiche ? 'FICHE_INITIALE' : 'RAPPORT_DPE'); setSignMode(null); setSigImage(null); }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                                     bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition cursor-pointer">
                          <PenTool className="w-4 h-4" /> Signer {label}
                        </button>
                      ) : (
                        <div className="bg-amber-100 rounded-xl p-3 space-y-2">
                          <p className="text-xs font-bold text-amber-800">Choisir le mode de signature</p>
                          {!signMode && (
                            <div className="flex gap-2">
                              <button onClick={() => setSignMode('STAMP')}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                                           bg-sos-blue text-white text-xs font-semibold hover:bg-sos-blue-dark transition cursor-pointer">
                                <Stamp className="w-3.5 h-3.5" /> Tampon
                              </button>
                              <button onClick={() => setSignMode('IMAGE')}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                                           bg-white border border-sos-gray-300 text-sos-gray-700 text-xs font-semibold
                                           hover:bg-sos-gray-50 transition cursor-pointer">
                                <Upload className="w-3.5 h-3.5" /> Image
                              </button>
                            </div>
                          )}
                          {signMode === 'STAMP' && (
                            <div className="space-y-2">
                              <div className="bg-white border border-dashed border-sos-blue rounded-lg p-2 text-center">
                                <p className="text-xs font-mono text-sos-gray-700">
                                  Signé par {JSON.parse(localStorage.getItem('user') || '{}').name || 'Directeur'}<br />
                                  Directeur Village — {new Date().toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              <button onClick={() => handleSign('STAMP')} disabled={!!actionLoading}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                                           bg-sos-blue text-white text-xs font-semibold hover:bg-sos-blue-dark transition
                                           disabled:opacity-60 cursor-pointer">
                                {actionLoading === 'sign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-3.5 h-3.5" />}
                                Appliquer le tampon
                              </button>
                            </div>
                          )}
                          {signMode === 'IMAGE' && (
                            <div className="space-y-2">
                              <label className="flex flex-col items-center gap-1 border-2 border-dashed border-sos-gray-300
                                                rounded-lg p-3 cursor-pointer hover:border-sos-blue transition">
                                <Upload className="w-5 h-5 text-sos-gray-400" />
                                <span className="text-[10px] text-sos-gray-500">{sigImage ? sigImage.name : 'Image PNG de signature'}</span>
                                <input type="file" accept="image/png,image/jpeg" className="hidden"
                                  onChange={(e) => setSigImage(e.target.files[0] || null)} />
                              </label>
                              {sigImage && <img src={URL.createObjectURL(sigImage)} alt="preview" className="mx-auto h-12 object-contain rounded border border-sos-gray-200" />}
                              <button onClick={() => handleSign('IMAGE')} disabled={!sigImage || !!actionLoading}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                                           bg-sos-blue text-white text-xs font-semibold hover:bg-sos-blue-dark transition
                                           disabled:opacity-60 cursor-pointer">
                                {actionLoading === 'sign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-3.5 h-3.5" />}
                                Signer
                              </button>
                            </div>
                          )}
                          <button onClick={() => { setSignTarget(null); setSignMode(null); setSigImage(null); }}
                            className="w-full text-[10px] text-sos-gray-500 hover:text-sos-gray-700 cursor-pointer">Annuler</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pièces jointes initiales (Level 1 uploads) if no workflow stages */}
            {item.attachments?.length > 0 && !Object.values(stages).some(s => s?.attachments?.length > 0) && (
              <div className="bg-sos-gray-50 rounded-xl p-4 border border-sos-gray-200">
                <p className="text-xs font-bold text-sos-gray-700 uppercase tracking-wide mb-2">Pièces jointes originales</p>
                <div className="space-y-1.5">
                  {item.attachments.map((a, i) => {
                    const mime = a.mimeType || '';
                    const canPreview = mime.startsWith('image/') || mime === 'application/pdf';
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border border-sos-gray-200">
                        <FileText className="w-4 h-4 text-sos-blue shrink-0" />
                        <span className="truncate flex-1 text-sos-gray-700">{a.originalName || a.filename}</span>
                        {canPreview && (
                          <button title="Aperçu" onClick={async () => {
                            try {
                              const { data } = await downloadAttachment(item._id, a.filename);
                              setPreviewFile({ url: URL.createObjectURL(new Blob([data], { type: mime })), name: a.originalName || a.filename, type: mime });
                            } catch { showToast('error', 'Erreur lors de l\'aperçu.'); }
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
                          } catch { showToast('error', 'Erreur lors du téléchargement.'); }
                        }} className="p-1 rounded hover:bg-sos-blue-light transition cursor-pointer">
                          <Download className="w-4 h-4 text-sos-blue" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No documents yet */}
            {!Object.values(stages).some(s => s?.completed || s?.attachments?.length > 0) && !item.attachments?.length && (
              <p className="text-xs text-sos-gray-400 italic">Aucun document soumis par le psychologue.</p>
            )}
          </div>

          {/* Forwarded info */}
          {item.forwardedToNational && (
            <div className="bg-sos-green-light border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Send className="w-4 h-4 text-sos-green" />
                <p className="text-xs font-bold text-sos-green uppercase tracking-wide">Envoyé au Responsable National</p>
              </div>
              <p className="text-[10px] text-sos-gray-400">Le {fmtDate(item.forwardedAt)}</p>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="pt-4 border-t border-sos-gray-200 space-y-2">
            {canForward && (
              <button onClick={handleForward} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-sos-green text-white text-sm font-semibold hover:bg-green-700 transition
                           disabled:opacity-60 cursor-pointer">
                {actionLoading === 'forward' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer au Responsable National
              </button>
            )}
            {canSign && !bothSigned && (
              <p className="text-xs text-center text-amber-600">
                {!ficheSigned && !dpeSigned ? 'Signez la Fiche Initiale et le Rapport DPE pour pouvoir transmettre.' :
                 !ficheSigned ? 'Il reste à signer la Fiche Initiale.' : 'Il reste à signer le Rapport DPE.'}
              </p>
            )}
            {item.status === 'CLOTURE' && !item.isArchived && (
              <button onClick={handleArchive} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-sos-gray-200 text-sos-gray-700 text-sm font-semibold
                           hover:bg-sos-gray-300 transition disabled:opacity-60 cursor-pointer">
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
              ) : previewFile.type?.startsWith('image/') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg" />
              ) : null}
            </div>
          </div>
        </div>
      )}
      {/* Toast notification */}
      <Toast toast={toast} onDismiss={dismissToast} />    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Signalement Card
   ═══════════════════════════════════════════════════════ */
const SignalementCard = ({ item, onClick }) => {
  const urg = URGENCY[item.urgencyLevel] || URGENCY.FAIBLE;
  const ds = DIRECTOR_STATUS[item.directorReviewStatus] || null;

  return (
    <div onClick={onClick}
      className="bg-white border border-sos-gray-200 rounded-xl p-4 hover:shadow-card-hover transition-all cursor-pointer group">
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${urg.bg} ${urg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} /> {urg.label}
        </span>
        <span className="text-xs text-sos-gray-400">{fmtShort(item.createdAt)}</span>
      </div>

      {ds && (
        <div className="mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ds.bg} ${ds.color}`}>
            <ds.icon className="w-3 h-3" /> {ds.label}
          </span>
        </div>
      )}

      <h4 className="text-sm font-semibold text-sos-gray-800 mb-1 line-clamp-1">
        {item.title || item.incidentType}
      </h4>
      <p className="text-xs text-sos-gray-500 mb-2 line-clamp-1">{item.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-sos-gray-400">{item.village?.name || '—'}</span>
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
  const [tab, setTab] = useState('pending'); // pending | signed | forwarded | all
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
      const csvRows = [headers.join(','), ...records.map(r => headers.map(h => {
        const val = r[h]; if (val == null) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(','))];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `export-village-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /* */ }
    setExporting(false);
  };

  // Director queue filters
  const pending   = signalements.filter(s => ['PENDING', 'PARTIALLY_SIGNED'].includes(s.directorReviewStatus)
                    || (s.status === 'CLOTURE' && !s.directorReviewStatus && !s.isArchived));
  const signed    = signalements.filter(s => s.directorReviewStatus === 'SIGNED');
  const forwarded = signalements.filter(s => s.directorReviewStatus === 'FORWARDED');
  const allActive = signalements.filter(s => ['EN_ATTENTE', 'EN_COURS'].includes(s.status) || s.directorReviewStatus);

  const filteredList = tab === 'pending' ? pending : tab === 'signed' ? signed : tab === 'forwarded' ? forwarded : allActive;

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
                Signature & transmission des dossiers · {user.village?.name || user.name}
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
          <StatCard label="Total village" value={ov.total ?? 0} icon={BarChart3} color="text-sos-blue" bgLight="bg-sos-blue-light" />
          <StatCard label="À signer" value={pending.length} icon={PenTool} color="text-amber-600" bgLight="bg-amber-100" />
          <StatCard label="Signés" value={signed.length} icon={FileCheck} color="text-sos-blue" bgLight="bg-sos-blue-light" />
          <StatCard label="Envoyés" value={forwarded.length} icon={Send} color="text-sos-green" bgLight="bg-sos-green-light" />
          <StatCard label="En cours" value={ov.enCours ?? 0} icon={Activity} color="text-yellow-700" bgLight="bg-sos-yellow-light" />
        </div>

        {/* Charts row */}
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

        {/* Tabs + list */}
        <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card">
          <div className="border-b border-sos-gray-200 px-6 pt-4">
            <div className="flex gap-6 overflow-x-auto">
              {[
                { key: 'pending',   label: 'À signer',     count: pending.length,   icon: PenTool },
                { key: 'signed',    label: 'Signés',        count: signed.length,    icon: FileCheck },
                { key: 'forwarded', label: 'Envoyés',       count: forwarded.length, icon: Send },
                { key: 'all',       label: 'Tous en cours', count: allActive.length,  icon: Activity },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`pb-3 text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    tab === t.key
                      ? 'border-sos-blue text-sos-blue'
                      : 'border-transparent text-sos-gray-500 hover:text-sos-gray-700'
                  }`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                  <span className="ml-1 text-xs bg-sos-gray-100 px-2 py-0.5 rounded-full">{t.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {filteredList.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-sos-gray-300 mx-auto mb-3" />
                <p className="text-sos-gray-500">
                  {tab === 'pending' ? 'Aucun dossier en attente de signature' : 'Aucun signalement dans cette catégorie'}
                </p>
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
