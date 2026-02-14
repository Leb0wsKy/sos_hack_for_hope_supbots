import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  MapPin,
  Activity,
  Eye,
  EyeOff,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Key,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
  BarChart3,
  Clock,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  getAdminUsers,
  createAdminUser,
  updateUserStatus,
  resetUserPassword,
  getVillages,
  getAnalytics,
} from '../services/api';

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */

const ROLE_CONFIG = {
  LEVEL1: { label: 'Niveau 1 — Déclarant', color: 'bg-sos-blue-light text-sos-blue', short: 'L1' },
  LEVEL2: { label: 'Niveau 2 — Analyste', color: 'bg-sos-green-light text-sos-green', short: 'L2' },
  LEVEL3: { label: 'Niveau 3 — Gouvernance', color: 'bg-sos-yellow-light text-yellow-700', short: 'L3' },
  LEVEL4: { label: 'Niveau 4 — Super Admin', color: 'bg-sos-red-light text-sos-red', short: 'L4' },
};

const ROLE_DETAILS_BY_LEVEL = {
  LEVEL1: ['SOS_MOTHER', 'EDUCATOR', 'FIELD_STAFF'],
  LEVEL2: ['PSYCHOLOGIST', 'SOCIAL_WORKER'],
  LEVEL3: ['VILLAGE_DIRECTOR', 'NATIONAL_OFFICE'],
  LEVEL4: ['SUPER_ADMIN'],
};

const ROLE_DETAIL_LABELS = {
  SOS_MOTHER: 'Mère SOS',
  EDUCATOR: 'Éducateur',
  FIELD_STAFF: 'Personnel terrain',
  PSYCHOLOGIST: 'Psychologue',
  SOCIAL_WORKER: 'Travailleur social',
  VILLAGE_DIRECTOR: 'Directeur de village',
  NATIONAL_OFFICE: 'Bureau national',
  SUPER_ADMIN: 'Super administrateur',
};

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

/* ── Stat Card ── */
const StatCard = ({ label, value, icon: Icon, color, bgLight }) => (
  <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card px-5 py-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow">
    <div className={`w-11 h-11 rounded-xl ${bgLight} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div>
      <p className="text-xs text-sos-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-extrabold ${color} callout-number`}>{value}</p>
    </div>
  </div>
);

/* ── User Row ── */
const UserRow = ({ user, onToggleStatus, onResetPassword, loadingId }) => {
  const [showReset, setShowReset] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.LEVEL1;

  const handleReset = () => {
    if (!newPwd.trim()) return;
    onResetPassword(user._id, newPwd);
    setNewPwd('');
    setShowReset(false);
  };

  return (
    <div className="bg-white border border-sos-gray-200 rounded-xl p-4 hover:shadow-card-hover transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Avatar + info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${roleCfg.color}`}>
            {roleCfg.short}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-sos-gray-900 truncate">{user.name}</p>
              {!user.isActive && (
                <span className="text-[10px] font-bold bg-sos-red-light text-sos-red px-1.5 py-0.5 rounded-full">
                  DÉSACTIVÉ
                </span>
              )}
            </div>
            <p className="text-xs text-sos-gray-500 truncate">{user.email}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-sos-gray-400">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${roleCfg.color}`}>
                {roleCfg.label}
              </span>
              {user.roleDetails && (
                <span>{ROLE_DETAIL_LABELS[user.roleDetails] || user.roleDetails}</span>
              )}
              {user.village && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {user.village.name || 'Village'}
                </span>
              )}
              {user.lastLogin && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(user.lastLogin).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle active */}
          <button
            onClick={() => onToggleStatus(user._id, !user.isActive)}
            disabled={loadingId === user._id}
            title={user.isActive ? 'Désactiver' : 'Activer'}
            className={`p-2 rounded-lg transition cursor-pointer disabled:opacity-50 ${
              user.isActive
                ? 'text-sos-green hover:bg-sos-green-light'
                : 'text-sos-red hover:bg-sos-red-light'
            }`}
          >
            {user.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>

          {/* Reset password */}
          <button
            onClick={() => setShowReset(!showReset)}
            title="Réinitialiser mot de passe"
            className="p-2 rounded-lg text-sos-gray-400 hover:text-sos-blue hover:bg-sos-blue-light transition cursor-pointer"
          >
            <Key className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Password reset form (expandable) */}
      {showReset && (
        <div className="mt-3 pt-3 border-t border-sos-gray-100 flex items-center gap-2 animate-fade-in">
          <div className="relative flex-1">
            <input
              type={showPwd ? 'text' : 'password'}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="w-full pl-3 pr-9 py-2 rounded-lg border border-sos-gray-300 text-sm
                         placeholder:text-sos-gray-400
                         focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sos-gray-400 hover:text-sos-gray-600"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleReset}
            disabled={!newPwd.trim() || loadingId === user._id}
            className="px-4 py-2 rounded-lg bg-sos-blue text-white text-sm font-medium
                       hover:bg-sos-blue-dark transition disabled:opacity-50 cursor-pointer"
          >
            Réinitialiser
          </button>
          <button
            onClick={() => { setShowReset(false); setNewPwd(''); }}
            className="p-2 rounded-lg text-sos-gray-400 hover:bg-sos-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Create User Modal ── */
const CreateUserModal = ({ open, onClose, onSubmit, villages, submitting }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'LEVEL1',
    roleDetails: '',
    village: '',
    phone: '',
    accessibleVillages: [],
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const availableRoleDetails = ROLE_DETAILS_BY_LEVEL[form.role] || [];

  // Reset roleDetails when role changes
  useEffect(() => {
    setForm((p) => ({ ...p, roleDetails: '' }));
  }, [form.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password || !form.role) {
      setError('Nom, email, mot de passe et rôle sont requis');
      return;
    }
    if (['LEVEL1', 'LEVEL2'].includes(form.role) && !form.village) {
      setError('Le village est requis pour les niveaux 1 et 2');
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
    };
    if (form.roleDetails) payload.roleDetails = form.roleDetails;
    if (form.village) payload.village = form.village;
    if (form.phone) payload.phone = form.phone;
    if (form.accessibleVillages.length > 0) payload.accessibleVillages = form.accessibleVillages;

    const ok = await onSubmit(payload);
    if (ok) {
      setForm({ name: '', email: '', password: '', role: 'LEVEL1', roleDetails: '', village: '', phone: '', accessibleVillages: [] });
      onClose();
    }
  };

  const toggleAccessibleVillage = (id) => {
    setForm((p) => {
      const list = p.accessibleVillages.includes(id)
        ? p.accessibleVillages.filter((v) => v !== id)
        : [...p.accessibleVillages, id];
      return { ...p, accessibleVillages: list };
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-sos-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sos-blue-light flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-sos-blue" />
            </div>
            <h2 className="text-lg font-bold text-sos-gray-900">Créer un utilisateur</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer">
            <X className="w-5 h-5 text-sos-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-sos-red bg-sos-red-light px-4 py-2.5 rounded-lg animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-sos-gray-700 mb-1">Nom complet *</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="Prénom et nom"
              className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm placeholder:text-sos-gray-400
                         focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-sos-gray-700 mb-1">Adresse email *</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="prenom.nom@sos-kd.org"
              className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm placeholder:text-sos-gray-400
                         focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-sos-gray-700 mb-1">Mot de passe *</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 8 caractères"
                className="w-full px-3 py-2.5 pr-10 rounded-lg border border-sos-gray-300 text-sm placeholder:text-sos-gray-400
                           focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sos-gray-400 hover:text-sos-gray-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-sos-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="+216 XX XXX XXX"
              className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm placeholder:text-sos-gray-400
                         focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-sos-gray-700 mb-1">Rôle *</label>
            <select
              value={form.role}
              onChange={set('role')}
              className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
            >
              {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Role Details */}
          {availableRoleDetails.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-sos-gray-700 mb-1">Sous-rôle</label>
              <select
                value={form.roleDetails}
                onChange={set('roleDetails')}
                className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
              >
                <option value="">— Sélectionner —</option>
                {availableRoleDetails.map((rd) => (
                  <option key={rd} value={rd}>{ROLE_DETAIL_LABELS[rd] || rd}</option>
                ))}
              </select>
            </div>
          )}

          {/* Village (required for L1/L2) */}
          <div>
            <label className="block text-sm font-medium text-sos-gray-700 mb-1">
              Village {['LEVEL1', 'LEVEL2'].includes(form.role) ? '*' : ''}
            </label>
            <select
              value={form.village}
              onChange={set('village')}
              className="w-full px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
            >
              <option value="">— Aucun —</option>
              {villages.map((v) => (
                <option key={v._id} value={v._id}>{v.name} — {v.location}</option>
              ))}
            </select>
          </div>

          {/* Accessible Villages (for L2/L3) */}
          {['LEVEL2', 'LEVEL3'].includes(form.role) && villages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-sos-gray-700 mb-1">
                Villages accessibles
              </label>
              <div className="max-h-36 overflow-y-auto border border-sos-gray-200 rounded-lg p-2 space-y-1 custom-scrollbar">
                {villages.map((v) => (
                  <label key={v._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sos-gray-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.accessibleVillages.includes(v._id)}
                      onChange={() => toggleAccessibleVillage(v._id)}
                      className="accent-sos-blue w-4 h-4"
                    />
                    <span className="text-sos-gray-700">{v.name}</span>
                    <span className="text-sos-gray-400 text-xs ml-auto">{v.location}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl
                         bg-sos-blue text-white font-semibold text-sm
                         hover:bg-sos-blue-dark active:scale-[0.98] transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Créer l'utilisateur
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-sos-gray-300 text-sos-gray-600 text-sm font-medium
                         hover:bg-sos-gray-50 transition cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════ */
function DashboardLevel4() {
  const [users, setUsers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Data fetching ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterRole) params.role = filterRole;
      if (filterActive) params.isActive = filterActive;

      const [usersRes, villagesRes, analyticsRes] = await Promise.all([
        getAdminUsers(params),
        getVillages(),
        getAnalytics(),
      ]);

      const userList = usersRes.data?.users || [];
      setUsers(userList);

      const vList = Array.isArray(villagesRes.data) ? villagesRes.data : villagesRes.data?.villages || [];
      setVillages(vList);

      setAnalytics(analyticsRes.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [filterRole, filterActive]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Actions ── */
  const handleToggleStatus = async (id, isActive) => {
    setLoadingId(id);
    try {
      await updateUserStatus(id, { isActive });
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isActive } : u))
      );
      showToast(isActive ? 'Utilisateur activé' : 'Utilisateur désactivé');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur', 'error');
    }
    setLoadingId('');
  };

  const handleResetPassword = async (id, newPassword) => {
    setLoadingId(id);
    try {
      await resetUserPassword(id, { newPassword });
      showToast('Mot de passe réinitialisé');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur', 'error');
    }
    setLoadingId('');
  };

  const handleCreateUser = async (payload) => {
    setSubmitting(true);
    try {
      await createAdminUser(payload);
      showToast('Utilisateur créé avec succès');
      fetchData();
      setSubmitting(false);
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la création', 'error');
      setSubmitting(false);
      return false;
    }
  };

  /* ── Filtering (client-side search over already-fetched list) ── */
  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      const haystack = `${u.name} ${u.email} ${u.roleDetails || ''} ${u.village?.name || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  /* ── Computed stats ── */
  const roleCounts = {
    LEVEL1: users.filter((u) => u.role === 'LEVEL1').length,
    LEVEL2: users.filter((u) => u.role === 'LEVEL2').length,
    LEVEL3: users.filter((u) => u.role === 'LEVEL3').length,
    LEVEL4: users.filter((u) => u.role === 'LEVEL4').length,
  };
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.length - activeCount;
  const ov = analytics?.overview || {};

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50 pb-12">
      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-20 right-6 z-[60] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
          toast.type === 'error'
            ? 'bg-sos-red-light border border-sos-red/20 text-sos-red'
            : 'bg-sos-green-light border border-sos-green/20 text-sos-green'
        }`}>
          {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white border-b border-sos-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-sos-gray-900">Super Administration</h1>
              <p className="text-sm text-sos-gray-500">Gestion des utilisateurs, villages et vue système</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="p-2 rounded-lg hover:bg-sos-gray-100 transition cursor-pointer"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-4 h-4 text-sos-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sos-blue text-white text-sm font-medium
                           hover:bg-sos-blue-dark transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Créer un utilisateur</span>
                <span className="sm:hidden">Créer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-sos-blue animate-spin" />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* ═══ Row 1: System-wide stat cards ═══ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Utilisateurs" value={users.length} icon={Users} color="text-sos-blue" bgLight="bg-sos-blue-light" />
            <StatCard label="Actifs" value={activeCount} icon={CheckCircle2} color="text-sos-green" bgLight="bg-sos-green-light" />
            <StatCard label="Inactifs" value={inactiveCount} icon={XCircle} color="text-sos-red" bgLight="bg-sos-red-light" />
            <StatCard label="Villages" value={villages.length} icon={Building2} color="text-sos-brown" bgLight="bg-sos-brown-light" />
            <StatCard label="Signalements" value={ov.total ?? '—'} icon={BarChart3} color="text-sos-blue" bgLight="bg-sos-blue-light" />
            <StatCard label="En attente" value={ov.enAttente ?? '—'} icon={Clock} color="text-yellow-700" bgLight="bg-sos-yellow-light" />
          </div>

          {/* ═══ Row 2: Role breakdown pills ═══ */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
              <div key={role} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${cfg.color} text-sm font-semibold`}>
                <Shield className="w-3.5 h-3.5" />
                {cfg.short}: {roleCounts[role]}
              </div>
            ))}
          </div>

          {/* ═══ Row 3: Filters + User List ═══ */}
          <div className="bg-white border border-sos-gray-200 rounded-xl shadow-card overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-sos-gray-100 flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sos-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur…"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-sos-gray-300 text-sm placeholder:text-sos-gray-400
                             focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue transition"
                />
              </div>

              {/* Role filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-sos-gray-400" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-sos-gray-300 text-sm bg-white
                             focus:outline-none focus:ring-2 focus:ring-sos-blue/40"
                >
                  <option value="">Tous les rôles</option>
                  {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Active filter */}
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="px-3 py-2 rounded-lg border border-sos-gray-300 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-sos-blue/40"
              >
                <option value="">Tous les statuts</option>
                <option value="true">Actifs</option>
                <option value="false">Inactifs</option>
              </select>
            </div>

            {/* User list */}
            <div className="p-4 space-y-3 max-h-[calc(100vh-26rem)] overflow-y-auto custom-scrollbar">
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-sos-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-sos-gray-400">Aucun utilisateur trouvé</p>
                </div>
              )}
              {filtered.map((u) => (
                <UserRow
                  key={u._id}
                  user={u}
                  onToggleStatus={handleToggleStatus}
                  onResetPassword={handleResetPassword}
                  loadingId={loadingId}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-sos-gray-100 bg-sos-gray-50 text-xs text-sos-gray-400">
              {filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''} affichés sur {users.length} total
            </div>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateUser}
        villages={villages}
        submitting={submitting}
      />
    </div>
  );
}

export default DashboardLevel4;
