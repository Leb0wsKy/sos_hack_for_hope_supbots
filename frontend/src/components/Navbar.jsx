import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

/* ── SOS brand logo text (speech-bubble accent on the dot) ── */
const BrandMark = () => (
  <div className="flex items-center gap-2">
    <div className="w-9 h-9 rounded-lg bg-sos-white flex items-center justify-center shadow-sm">
      <Shield className="w-5 h-5 text-sos-blue" strokeWidth={2.5} />
    </div>
    <span className="text-lg font-bold tracking-tight text-sos-white select-none">
      SOS&nbsp;<span className="font-extrabold">Safeguarding</span>
    </span>
  </div>
);

const navLinks = [
  { to: '/dashboard-level1', label: 'Signalement', roles: ['LEVEL1', 'LEVEL2', 'LEVEL3', 'LEVEL4'] },
  { to: '/dashboard-level2', label: 'Traitement', roles: ['LEVEL2', 'LEVEL3', 'LEVEL4'] },
  { to: '/dashboard-level3', label: 'Gouvernance', roles: ['LEVEL3', 'LEVEL4'] },
  { to: '/dashboard-level4', label: 'Admin', roles: ['LEVEL4'] },
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const [mobileOpen, setMobileOpen] = useState(false);

  let user = null;
  try {
    const stored = localStorage.getItem('user');
    if (stored) user = JSON.parse(stored);
  } catch { /* ignore */ }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const visibleLinks = navLinks.filter(
    (l) => !user || l.roles.includes(user.role)
  );

  if (!token) return null;

  return (
    <nav className="sticky top-0 z-50 bg-sos-blue shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <BrandMark />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {visibleLinks.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-white/20 text-white'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <span className="text-sm text-blue-200">
                {user.name}
                <span className="ml-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-blue-100 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-sos-blue border-t border-white/10 pb-4 animate-fade-in">
          <div className="px-4 pt-2 space-y-1">
            {visibleLinks.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                    active ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-white/10"
            >
              <LogOut className="inline w-4 h-4 mr-1.5" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
