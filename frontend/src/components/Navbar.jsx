import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, User, ChevronDown, Bell, Home, ClipboardList, Building2, Globe, BarChart3, ShieldCheck } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/* ── SOS brand logo with actual logo image ── */
const BrandMark = () => (
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform p-1.5">
      <img src="/logo_sos.png" alt="SOS Logo" className="w-full h-full object-contain" />
    </div>
    <span className="text-xl font-bold tracking-tight text-sos-navy select-none">
      SOS&nbsp;<span className="font-semibold bg-gradient-to-r from-sos-blue to-sos-coral bg-clip-text text-transparent">Safeguarding</span>
    </span>
  </div>
);

/* ── Role badge colors ── */
const ROLE_COLORS = {
  LEVEL1: 'bg-sos-green text-white',
  LEVEL2: 'bg-sos-blue text-white',
  LEVEL3: 'bg-amber-500 text-white',
  LEVEL4: 'bg-sos-coral text-white',
};

const ROLE_LABELS = {
  LEVEL1: 'Niveau 1',
  LEVEL2: 'Analyste',
  LEVEL3: 'Gouvernance',
  LEVEL4: 'Super Admin',
};

const navLinks = [
  { to: '/dashboard-level1', label: 'Signalement', roles: ['LEVEL1'], icon: Home },
  { to: '/dashboard-level2', label: 'Traitement', roles: ['LEVEL2'], icon: ClipboardList },
  { to: '/dashboard-directeur', label: 'Directeur', roles: ['LEVEL3'], roleDetails: ['VILLAGE_DIRECTOR'], icon: Building2 },
  { to: '/dashboard-national', label: 'National', roles: ['LEVEL3'], roleDetails: ['NATIONAL_OFFICE'], icon: Globe },
  { to: '/dashboard-level4', label: 'Admin', roles: ['LEVEL4'], icon: ShieldCheck },
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  let user = null;
  try {
    const stored = localStorage.getItem('user');
    if (stored) user = JSON.parse(stored);
  } catch { /* ignore */ }

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setProfileOpen(false);
    setMobileOpen(false);
    navigate('/login');
  };

  const visibleLinks = navLinks.filter((l) => {
    if (!user) return false;
    if (!l.roles.includes(user.role)) return false;
    // Sub-role specific: only show for matching roleDetails
    if (l.roleDetails) {
      return l.roleDetails.includes(user.roleDetails);
    }
    return true;
  });

  // Hide navbar on landing and login pages
  if (!token || location.pathname === '/' || location.pathname === '/login') return null;

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-sos-blue-lighter via-white to-sos-blue-lighter/80 shadow-xl border-b border-sos-blue-light/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand */}
          <Link to="/dashboard-level1" className="flex-shrink-0">
            <BrandMark />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-2">
            {visibleLinks.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`
                    px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-sos-blue to-sos-coral text-white shadow-lg scale-105'
                      : 'text-sos-navy hover:bg-white hover:text-sos-blue hover:scale-105 hover:shadow-md'}
                  `}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          {/* Right side - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-3 text-sos-navy hover:text-sos-blue hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-sos-coral rounded-full ring-2 ring-white"></span>
            </button>

            {/* User Profile Dropdown */}
            {user && (
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sos-navy hover:text-sos-blue hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sos-blue to-sos-coral flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold leading-tight">{user.name}</p>
                    <p className="text-xs text-sos-gray-600">{ROLE_LABELS[user.role] || user.role}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-sos-blue-light/20 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 bg-gradient-to-r from-sos-blue-lighter to-white border-b border-sos-blue-light/30">
                      <p className="text-sm font-bold text-sos-navy">{user.name}</p>
                      <p className="text-xs text-sos-gray-600 mt-0.5">{user.email || 'Utilisateur'}</p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-500 text-white'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-sos-navy hover:bg-sos-blue-lighter transition-colors flex items-center gap-2.5"
                      >
                        <LogOut className="w-4 h-4 text-sos-coral" />
                        <span className="font-medium">Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-sos-navy p-2.5 hover:bg-white rounded-xl transition-colors shadow-sm hover:shadow-md"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-gradient-to-b from-white to-sos-blue-lighter border-t border-sos-blue-light/30 pb-4 animate-fade-in shadow-xl">
          {/* User info in mobile */}
          {user && (
            <div className="px-4 py-4 border-b border-sos-blue-light/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sos-blue to-sos-coral flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-sos-navy">{user.name}</p>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-500 text-white'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mobile navigation links */}
          <div className="px-4 pt-2 space-y-1.5">
            {visibleLinks.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active 
                      ? 'bg-gradient-to-r from-sos-blue to-sos-coral text-white shadow-md' 
                      : 'text-sos-navy hover:bg-white hover:text-sos-blue hover:shadow-sm'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            
            {/* Mobile logout button */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-sos-navy 
                         hover:bg-white hover:text-sos-coral transition-all flex items-center gap-2.5 mt-2 hover:shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
