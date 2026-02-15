import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  X,
  FileText,
  Image,
  Film,
  Mic,
  AlertTriangle,
  CheckCircle2,
  UserX,
  Send,
  Loader2,
} from 'lucide-react';
import { createSignalement, getVillages } from '../services/api';

/* ── Constant maps ── */
const INCIDENT_TYPES = [
  { value: 'VIOLENCE_PHYSIQUE', label: 'Violence physique' },
  { value: 'VIOLENCE_PSYCHOLOGIQUE', label: 'Violence psychologique' },
  { value: 'VIOLENCE_SEXUELLE', label: 'Violence sexuelle' },
  { value: 'NEGLIGENCE', label: 'Négligence' },
  { value: 'SANTE', label: 'Santé' },
  { value: 'COMPORTEMENT', label: 'Comportement' },
  { value: 'EDUCATION', label: 'Éducation' },
  { value: 'FAMILIAL', label: 'Problème familial' },
  { value: 'AUTRE', label: 'Autre' },
];

const URGENCY_LEVELS = [
  { value: 'FAIBLE', label: 'Faible', color: 'bg-sos-green text-white', ring: 'ring-sos-green/30' },
  { value: 'MOYEN', label: 'Moyen', color: 'bg-sos-yellow text-sos-gray-900', ring: 'ring-sos-yellow/30' },
  { value: 'ELEVE', label: 'Élevé', color: 'bg-orange-500 text-white', ring: 'ring-orange-500/30' },
  { value: 'CRITIQUE', label: 'Critique', color: 'bg-sos-red text-white', ring: 'ring-sos-red/30' },
];

const FILE_ICONS = {
  image: Image,
  video: Film,
  audio: Mic,
  default: FileText,
};

const getFileIcon = (mimeType = '') => {
  if (mimeType.startsWith('image')) return FILE_ICONS.image;
  if (mimeType.startsWith('video')) return FILE_ICONS.video;
  if (mimeType.startsWith('audio')) return FILE_ICONS.audio;
  return FILE_ICONS.default;
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

/* ──────────────────────────────────────────────── */
/*  Level 1 Dashboard — Field Declarant Form       */
/* ──────────────────────────────────────────────── */
function DashboardLevel1() {
  const fileInputRef = useRef(null);

  /* form state */
  const [form, setForm] = useState({
    village: '',
    program: '',
    childName: '',
    abuserName: '',
    incidentType: '',
    urgencyLevel: 'MOYEN',
    description: '',
    isAnonymous: false,
    title: '',
  });
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  /* villages from API */
  const [villages, setVillages] = useState([]);
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    getVillages()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.villages || [];
        setVillages(list);
      })
      .catch(() => setVillages([]));
  }, []);

  /* When village changes, update programs */
  useEffect(() => {
    if (form.village) {
      const v = villages.find((v) => v._id === form.village);
      setPrograms(v?.programs || []);
      if (v?.programs?.length && !v.programs.includes(form.program)) {
        setForm((prev) => ({ ...prev, program: '' }));
      }
    } else {
      setPrograms([]);
    }
  }, [form.village, villages]);

  /* helpers */
  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addFiles = useCallback(
    (incoming) => {
      const allowed = 5 - files.length;
      if (allowed <= 0) return;
      setFiles((prev) => [...prev, ...incoming.slice(0, allowed)]);
    },
    [files.length]
  );

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  /* drag-and-drop */
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files));
  };

  /* submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('description', form.description);
      fd.append('isAnonymous', form.isAnonymous);
      if (form.title) fd.append('title', form.title);
      if (form.village) fd.append('village', form.village);
      if (form.program) fd.append('program', form.program);
      if (form.incidentType) fd.append('incidentType', form.incidentType);
      if (form.urgencyLevel) fd.append('urgencyLevel', form.urgencyLevel);
      // Always send child/abuser names — anonymous only hides the reporter
      if (form.childName) fd.append('childName', form.childName);
      if (form.abuserName) fd.append('abuserName', form.abuserName);
      files.forEach((f) => fd.append('attachments', f));

      await createSignalement(fd);

      setSuccess(true);
      setForm({
        village: '', program: '', childName: '', abuserName: '',
        incidentType: '', urgencyLevel: 'MOYEN', description: '',
        isAnonymous: false, title: '',
      });
      setFiles([]);

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-sos-gray-900">
            Nouveau Signalement
          </h1>
          <p className="mt-1 text-sm text-sos-gray-500">
            Remplissez ce formulaire pour déclarer un incident. Les champs marqués * sont obligatoires.
          </p>
        </div>

        {/* ── Success toast ── */}
        {success && (
          <div className="mb-6 flex items-center gap-3 bg-sos-green-light border border-sos-green/20 text-sos-green px-5 py-3 rounded-xl animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">Signalement envoyé avec succès.</span>
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-sos-red-light border border-sos-red/20 text-sos-red px-5 py-3 rounded-xl animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            Main form card — SPEECH-BUBBLE motif
            3 sharp corners + bottom-right heavy round
        ═══════════════════════════════════════════ */}
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-card rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-[2.5rem]
                     border border-sos-gray-200 p-6 sm:p-8 space-y-8"
        >
          {/* ── Section: Anonymous toggle ── */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-sos-blue-light/60 border border-sos-blue/10">
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5 text-sos-blue" />
              <div>
                <p className="text-sm font-semibold text-sos-gray-800">Signalement anonyme</p>
                <p className="text-xs text-sos-gray-500">
                  Votre identité ne sera pas visible
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.isAnonymous}
                onChange={set('isAnonymous')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-sos-gray-300 rounded-full peer
                              peer-checked:bg-sos-blue
                              after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                              after:bg-white after:rounded-full after:h-5 after:w-5
                              after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          {/* ── Section: Location ── */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-2">
              Localisation
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Village */}
              <div>
                <label className="block text-sm font-medium text-sos-gray-700 mb-1">
                  Village / Programme SOS
                </label>
                <select
                  value={form.village}
                  onChange={set('village')}
                  className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm bg-white
                             focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
                >
                  <option value="">— Sélectionner —</option>
                  {villages.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} — {v.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Program */}
              <div>
                <label className="block text-sm font-medium text-sos-gray-700 mb-1">
                  Programme
                </label>
                {programs.length > 0 ? (
                  <select
                    value={form.program}
                    onChange={set('program')}
                    className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm bg-white
                               focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
                  >
                    <option value="">— Sélectionner —</option>
                    {programs.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.program}
                    onChange={set('program')}
                    placeholder="Ex: Renforcement familial"
                    className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm
                               placeholder:text-sos-gray-400
                               focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
                  />
                )}
              </div>
            </div>
          </fieldset>

          {/* ── Section: People (always visible — anonymous only hides the reporter) ── */}
          <fieldset className="space-y-4 animate-fade-in">
            <legend className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-2">
              Personnes concernées
            </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-sos-gray-700 mb-1">
                    Nom de l'enfant
                  </label>
                  <input
                    type="text"
                    value={form.childName}
                    onChange={set('childName')}
                    placeholder="Prénom et nom"
                    className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm
                               placeholder:text-sos-gray-400
                               focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sos-gray-700 mb-1">
                    Nom de l'agresseur présumé
                  </label>
                  <input
                    type="text"
                    value={form.abuserName}
                    onChange={set('abuserName')}
                    placeholder="Prénom et nom"
                    className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm
                               placeholder:text-sos-gray-400
                               focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
                  />
                </div>
              </div>
            </fieldset>

          {/* ── Section: Incident ── */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-2">
              Détails de l'incident
            </legend>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-sos-gray-700 mb-1">Titre</label>
              <input
                type="text"
                value={form.title}
                onChange={set('title')}
                placeholder="Titre court (optionnel)"
                className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm
                           placeholder:text-sos-gray-400
                           focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-sos-gray-700 mb-1">
                Type d'incident
              </label>
              <select
                value={form.incidentType}
                onChange={set('incidentType')}
                className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
              >
                <option value="">— Sélectionner —</option>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Urgency — pill radio group */}
            <div>
              <label className="block text-sm font-medium text-sos-gray-700 mb-2">
                Niveau d'urgence *
              </label>
              <div className="flex flex-wrap gap-2">
                {URGENCY_LEVELS.map((u) => {
                  const selected = form.urgencyLevel === u.value;
                  return (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, urgencyLevel: u.value }))}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer
                        ${selected
                          ? `${u.color} ring-2 ${u.ring} shadow-sm`
                          : 'bg-sos-gray-100 text-sos-gray-600 hover:bg-sos-gray-200'}`}
                    >
                      {u.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-sos-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={set('description')}
                required
                rows={5}
                placeholder="Décrivez les faits, le contexte, et toute information utile…"
                className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm
                           placeholder:text-sos-gray-400 resize-y
                           focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
              />
            </div>
          </fieldset>

          {/* ── Section: File Upload ── */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-sos-gray-700 uppercase tracking-wide mb-2">
              Pièces jointes
              <span className="ml-2 text-xs font-normal text-sos-gray-400">
                ({files.length}/5)
              </span>
            </legend>

            {/* Drop zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${dragOver
                  ? 'drop-zone-active border-sos-blue bg-sos-blue-light'
                  : 'border-sos-gray-300 hover:border-sos-blue/50 hover:bg-sos-gray-50'}
              `}
            >
              <Upload className="w-8 h-8 mx-auto text-sos-gray-400 mb-2" />
              <p className="text-sm text-sos-gray-600 font-medium">
                Glissez vos fichiers ici ou <span className="text-sos-blue underline">parcourir</span>
              </p>
              <p className="text-xs text-sos-gray-400 mt-1">
                Photos, vidéos, audio — max 5 fichiers
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={(e) => addFiles(Array.from(e.target.files))}
                className="hidden"
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((f, idx) => {
                  const Icon = getFileIcon(f.type);
                  return (
                    <li
                      key={idx}
                      className="flex items-center gap-3 bg-sos-gray-50 border border-sos-gray-200 rounded-lg px-4 py-2.5 animate-fade-in"
                    >
                      <Icon className="w-5 h-5 text-sos-blue shrink-0" />
                      <span className="text-sm text-sos-gray-700 truncate flex-1">{f.name}</span>
                      <span className="text-xs text-sos-gray-400">{formatBytes(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-sos-gray-400 hover:text-sos-red transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          {/* ── Submit ── */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2
                         px-8 py-3 rounded-xl bg-sos-blue text-white font-semibold text-sm
                         hover:bg-sos-blue-dark active:scale-[0.98] transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer le signalement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DashboardLevel1;
