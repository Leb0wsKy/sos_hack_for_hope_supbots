import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import BackgroundPattern from '../components/BackgroundPattern';

const ROLE_HOME = {
  LEVEL1: '/dashboard-level1',
  LEVEL2: '/dashboard-level2',
  LEVEL3: '/dashboard-level3',
  LEVEL4: '/dashboard-level4',
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(ROLE_HOME[data.user.role] || '/dashboard-level1');
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-sos-blue-lighter via-white to-sos-coral-light">
      <BackgroundPattern />

      <div className="relative w-full max-w-md px-4 z-10">
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl p-8 sm:p-10 border border-sos-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white flex items-center justify-center mb-5 shadow-lg transform hover:scale-105 transition-transform p-2">
              <img src="/logo_sos.png" alt="SOS Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-sos-navy mb-2">
              SOS Safeguarding
            </h1>
            <p className="text-sm text-sos-gray-600">
              Plateforme de signalement sécurisée
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-center gap-2 text-sm text-sos-coral bg-sos-coral-light px-4 py-3 rounded-xl border border-sos-coral/20 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-sos-navy mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="prenom.nom@sos-kd.org"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-sos-gray-200 text-sm text-sos-navy
                           placeholder:text-sos-gray-400 bg-white
                           focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue
                           transition-all hover:border-sos-gray-300"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-sos-navy mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-sos-gray-200 text-sm text-sos-navy
                             placeholder:text-sos-gray-400 bg-white
                             focus:outline-none focus:ring-2 focus:ring-sos-blue/40 focus:border-sos-blue
                             transition-all hover:border-sos-gray-300 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sos-gray-400 hover:text-sos-blue transition-colors p-1 rounded-lg hover:bg-sos-blue-light/30"
                  tabIndex={-1}
                  aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-sos-blue text-white font-bold text-sm
                         hover:bg-sos-blue-dark hover:shadow-lg active:scale-[0.98] 
                         transition-all disabled:opacity-60 disabled:cursor-not-allowed
                         disabled:hover:shadow-none disabled:active:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connexion en cours...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-sos-gray-100">
            <p className="text-center text-xs text-sos-gray-500">
              Accès réservé au personnel autorisé de SOS Villages d'Enfants
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
