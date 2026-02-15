import { Link } from 'react-router-dom';
import {
  Shield,
  Heart,
  Users,
  BookOpen,
  Home,
  ArrowRight,
  ChevronRight,
  Globe,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Activity,
  FileText,
  Lock,
  BarChart3,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════
   SOS Children's Villages icon (adult + child)
   ═══════════════════════════════════════════════════ */
const SOSIcon = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className}>
    {/* Adult figure */}
    <circle cx="28" cy="14" r="7" fill="currentColor" />
    <path
      d="M28 23c-6 0-11 5-11 11v10a3 3 0 003 3h16a3 3 0 003-3V34c0-6-5-11-11-11z"
      fill="currentColor"
    />
    {/* Child figure */}
    <circle cx="44" cy="24" r="5" fill="currentColor" opacity="0.75" />
    <path
      d="M44 31c-4 0-7.5 3.5-7.5 7.5V45a2 2 0 002 2h11a2 2 0 002-2v-6.5c0-4-3.5-7.5-7.5-7.5z"
      fill="currentColor"
      opacity="0.75"
    />
  </svg>
);

/* ═══════════════════════════════════════════════════
   Stat counter
   ═══════════════════════════════════════════════════ */
const StatCard = ({ value, label, icon: Icon }) => (
  <div className="text-center group">
    <div className="mx-auto w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3 group-hover:bg-white/20 transition">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <p className="text-3xl font-extrabold text-white callout-number">{value}</p>
    <p className="text-sm text-blue-200 mt-1">{label}</p>
  </div>
);

/* ═══════════════════════════════════════════════════
   Service card
   ═══════════════════════════════════════════════════ */
const ServiceCard = ({ icon: Icon, title, description, color }) => (
  <div className="bg-white bubble shadow-card hover:shadow-card-hover transition-all duration-300 p-6 group hover:-translate-y-1">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-lg font-bold text-sos-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-sos-gray-500 leading-relaxed">{description}</p>
  </div>
);

/* ═══════════════════════════════════════════════════
   Platform feature card
   ═══════════════════════════════════════════════════ */
const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="flex gap-4 items-start">
    <div className="w-10 h-10 rounded-lg bg-sos-blue-light flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-sos-blue" />
    </div>
    <div>
      <h4 className="text-sm font-bold text-sos-gray-800">{title}</h4>
      <p className="text-sm text-sos-gray-500 mt-0.5">{description}</p>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════
   Main Landing Page
   ═══════════════════════════════════════════════════ */
function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-sos-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sos-blue flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight text-sos-gray-900">
                SOS&nbsp;<span className="text-sos-blue">Safeguarding</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <a href="#about" className="text-sm font-medium text-sos-gray-600 hover:text-sos-blue transition">
                À propos
              </a>
              <a href="#services" className="text-sm font-medium text-sos-gray-600 hover:text-sos-blue transition">
                Services
              </a>
              <a href="#platform" className="text-sm font-medium text-sos-gray-600 hover:text-sos-blue transition">
                Plateforme
              </a>
              <a href="#contact" className="text-sm font-medium text-sos-gray-600 hover:text-sos-blue transition">
                Contact
              </a>
            </div>

            <Link
              to="/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sos-blue text-white text-sm font-semibold
                         hover:bg-sos-blue-dark active:scale-[0.97] transition-all shadow-sm"
            >
              Se connecter
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sos-blue via-sos-blue-dark to-[#003D73]" />

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[200px] h-[200px] bg-sos-yellow/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 lg:pt-28 lg:pb-36">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-blue-200 text-xs font-medium mb-6 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                SOS Villages d'Enfants Tunisie
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                Un foyer aimant
                <br />
                pour <span className="text-sos-yellow">chaque enfant</span>
              </h1>

              <p className="mt-6 text-lg text-blue-200 leading-relaxed max-w-xl">
                Plateforme de signalement et de protection de l'enfance.
                Ensemble, nous assurons la sécurité, le bien-être et l'avenir
                des enfants les plus vulnérables en Tunisie.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-sos-blue font-bold text-sm
                             hover:bg-sos-gray-50 active:scale-[0.97] transition-all shadow-lg"
                >
                  Accéder à la plateforme
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#about"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-white/30 text-white font-bold text-sm
                             hover:bg-white/10 transition-all"
                >
                  En savoir plus
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right — illustration card */}
            <div className="hidden lg:flex justify-center animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <div className="relative">
                {/* Main card */}
                <div className="bg-white/10 backdrop-blur-sm bubble p-8 border border-white/20 w-[400px]">
                  <SOSIcon className="w-20 h-20 text-white mb-6" />
                  <h2 className="text-2xl font-extrabold text-white mb-2">Protection de l'enfance</h2>
                  <p className="text-blue-200 text-sm leading-relaxed">
                    Signaler, suivre et résoudre — un processus structuré pour protéger
                    les enfants à travers tout le réseau SOS.
                  </p>
                  <div className="mt-6 flex gap-2">
                    <span className="px-3 py-1 bg-white/15 rounded-full text-xs text-white font-medium">Signalement</span>
                    <span className="px-3 py-1 bg-white/15 rounded-full text-xs text-white font-medium">Workflow</span>
                    <span className="px-3 py-1 bg-white/15 rounded-full text-xs text-white font-medium">Suivi</span>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-6 bg-sos-yellow bubble px-4 py-2 shadow-lg">
                  <p className="text-sm font-bold text-sos-gray-900">4 Villages</p>
                  <p className="text-xs text-sos-gray-600">actifs en Tunisie</p>
                </div>

                {/* Floating badge 2 */}
                <div className="absolute -top-3 -right-4 bg-white bubble-alt px-4 py-2 shadow-lg">
                  <p className="text-sm font-bold text-sos-green">Temps réel</p>
                  <p className="text-xs text-sos-gray-500">Notifications</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 pt-10 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatCard value="4" label="Villages SOS" icon={Home} />
              <StatCard value="136" label="Pays dans le monde" icon={Globe} />
              <StatCard value="30+" label="Années en Tunisie" icon={Heart} />
              <StatCard value="24/7" label="Support continu" icon={Activity} />
            </div>
          </div>
        </div>
      </section>

      {/* ── About Section ── */}
      <section id="about" className="py-20 bg-sos-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sos-blue-light text-sos-blue text-xs font-semibold mb-4">
                <Heart className="w-3.5 h-3.5" />
                Qui sommes-nous
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-sos-gray-900 leading-tight">
                Renforcer les familles,
                <br />
                <span className="text-sos-blue">protéger les enfants</span>
              </h2>
              <p className="mt-6 text-sos-gray-600 leading-relaxed">
                <strong>SOS Villages d'Enfants</strong> est la plus grande organisation au monde
                dédiée à la prise en charge des enfants orphelins et abandonnés. Présente en
                <strong> Tunisie depuis plus de 30 ans</strong>, nous offrons un
                environnement familial aimant à travers nos 4 villages à Gammarth, Siliana,
                Mahres et Akouda.
              </p>
              <p className="mt-4 text-sos-gray-600 leading-relaxed">
                Notre mission est de veiller à ce que chaque enfant grandisse dans un foyer
                sûr et bienveillant, avec accès à l'éducation, aux soins de santé et au
                soutien psychosocial nécessaire pour s'épanouir.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white bubble p-4 shadow-card">
                  <p className="text-2xl font-extrabold text-sos-blue callout-number">4</p>
                  <p className="text-sm text-sos-gray-500 mt-1">Villages en Tunisie</p>
                </div>
                <div className="bg-white bubble p-4 shadow-card">
                  <p className="text-2xl font-extrabold text-sos-green callout-number">500+</p>
                  <p className="text-sm text-sos-gray-500 mt-1">Enfants pris en charge</p>
                </div>
                <div className="bg-white bubble p-4 shadow-card">
                  <p className="text-2xl font-extrabold text-sos-red callout-number">50+</p>
                  <p className="text-sm text-sos-gray-500 mt-1">Professionnels dédiés</p>
                </div>
                <div className="bg-white bubble p-4 shadow-card">
                  <p className="text-2xl font-extrabold text-sos-yellow callout-number">100%</p>
                  <p className="text-sm text-sos-gray-500 mt-1">Engagement pour l'enfance</p>
                </div>
              </div>
            </div>

            {/* Right — visual card stack */}
            <div className="relative flex justify-center">
              <div className="w-full max-w-md space-y-4">
                {/* Card 1 */}
                <div className="bg-white bubble shadow-card p-6 border-l-4 border-sos-blue hover:shadow-card-hover transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-sos-blue-light flex items-center justify-center">
                      <Home className="w-5 h-5 text-sos-blue" />
                    </div>
                    <h3 className="font-bold text-sos-gray-800">Accueil familial</h3>
                  </div>
                  <p className="text-sm text-sos-gray-500">
                    Chaque enfant grandit dans une famille SOS, avec une maman SOS et des
                    frères et sœurs, dans un environnement stable et aimant.
                  </p>
                </div>

                {/* Card 2 */}
                <div className="bg-white bubble shadow-card p-6 border-l-4 border-sos-green hover:shadow-card-hover transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-sos-green-light flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-sos-green" />
                    </div>
                    <h3 className="font-bold text-sos-gray-800">Éducation</h3>
                  </div>
                  <p className="text-sm text-sos-gray-500">
                    Accès à une éducation de qualité, soutien scolaire personnalisé et
                    formations professionnelles pour préparer l'avenir.
                  </p>
                </div>

                {/* Card 3 */}
                <div className="bg-white bubble shadow-card p-6 border-l-4 border-sos-red hover:shadow-card-hover transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-sos-red-light flex items-center justify-center">
                      <Shield className="w-5 h-5 text-sos-red" />
                    </div>
                    <h3 className="font-bold text-sos-gray-800">Protection</h3>
                  </div>
                  <p className="text-sm text-sos-gray-500">
                    Système de signalement et de suivi pour garantir la sécurité et le
                    bien-être de chaque enfant dans nos programmes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Section ── */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sos-blue-light text-sos-blue text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Nos services
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-sos-gray-900">
              Ce que nous offrons
            </h2>
            <p className="mt-3 text-sos-gray-500 max-w-2xl mx-auto">
              Des programmes complets pour accompagner chaque enfant dans son parcours
              vers une vie épanouie et autonome.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ServiceCard
              icon={Home}
              title="Accueil familial"
              description="Un foyer aimant avec une maman SOS, des frères et sœurs dans un environnement familial sécurisant."
              color="bg-sos-blue"
            />
            <ServiceCard
              icon={BookOpen}
              title="Éducation & Formation"
              description="Scolarisation, soutien scolaire, bourses et formations professionnelles pour l'autonomie."
              color="bg-sos-green"
            />
            <ServiceCard
              icon={Heart}
              title="Santé & Bien-être"
              description="Suivi médical, soutien psychologique et accompagnement pour le développement de chaque enfant."
              color="bg-sos-red"
            />
            <ServiceCard
              icon={Users}
              title="Renforcement familial"
              description="Programmes de soutien aux familles en difficulté pour prévenir la séparation familiale."
              color="bg-sos-yellow"
            />
          </div>
        </div>
      </section>

      {/* ── Platform Section ── */}
      <section id="platform" className="py-20 bg-sos-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sos-blue-light text-sos-blue text-xs font-semibold mb-4">
                <Shield className="w-3.5 h-3.5" />
                Plateforme Safeguarding
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-sos-gray-900 leading-tight">
                Un outil numérique
                <br />
                <span className="text-sos-blue">au service de la protection</span>
              </h2>
              <p className="mt-6 text-sos-gray-600 leading-relaxed">
                Notre plateforme <strong>SOS Safeguarding</strong> digitalise l'ensemble du
                processus de signalement et de suivi des incidents, du terrain jusqu'à
                la gouvernance nationale.
              </p>

              <div className="mt-8 space-y-5">
                <FeatureCard
                  icon={FileText}
                  title="Signalement simplifié"
                  description="Les éducateurs et mamans SOS signalent en quelques clics, avec pièces jointes et géolocalisation."
                />
                <FeatureCard
                  icon={Activity}
                  title="Workflow structuré en 7 étapes"
                  description="Rapport initial, DPE, évaluation, plan d'action, suivi, rapport final et clôture."
                />
                <FeatureCard
                  icon={Lock}
                  title="Sécurité & confidentialité"
                  description="Contrôle d'accès à 4 niveaux, audit trail complet et signalements anonymes."
                />
                <FeatureCard
                  icon={BarChart3}
                  title="Analytique & heatmaps"
                  description="Tableaux de bord en temps réel pour la gouvernance avec visualisation géographique."
                />
              </div>
            </div>

            {/* Right — process visual */}
            <div className="flex justify-center">
              <div className="bg-white bubble shadow-card-hover p-8 w-full max-w-md">
                <h3 className="text-lg font-bold text-sos-gray-900 mb-6">Processus de signalement</h3>
                <div className="space-y-1">
                  {[
                    { step: '01', label: 'Signalement terrain', desc: 'Maman SOS / Éducateur', color: 'bg-sos-blue' },
                    { step: '02', label: 'Prise en charge', desc: 'Psychologue / AS', color: 'bg-sos-green' },
                    { step: '03', label: 'Rapport DPE', desc: 'Évaluation assistée par IA', color: 'bg-[#005BA6]' },
                    { step: '04', label: 'Plan d\'action', desc: 'Intervention structurée', color: 'bg-sos-yellow' },
                    { step: '05', label: 'Suivi & clôture', desc: 'Gouvernance & archivage', color: 'bg-sos-red' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-sos-gray-50 transition group">
                      <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                        <span className="text-white text-xs font-bold">{item.step}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-sos-gray-800">{item.label}</p>
                        <p className="text-xs text-sos-gray-400">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-sos-gray-300 group-hover:text-sos-blue transition" />
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-sos-gray-200">
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sos-blue text-white text-sm font-bold
                               hover:bg-sos-blue-dark transition-all"
                  >
                    Accéder à la plateforme
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Villages Map Section ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sos-blue-light text-sos-blue text-xs font-semibold mb-4">
              <MapPin className="w-3.5 h-3.5" />
              Nos villages
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-sos-gray-900">
              4 villages à travers la Tunisie
            </h2>
            <p className="mt-3 text-sos-gray-500 max-w-2xl mx-auto">
              Chaque village offre un cadre de vie sécurisé et bienveillant pour les enfants qui en ont besoin.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Gammarth', region: 'Tunis', programs: 3, color: 'border-sos-blue', icon: 'bg-sos-blue-light text-sos-blue' },
              { name: 'Siliana', region: 'Siliana', programs: 2, color: 'border-sos-green', icon: 'bg-sos-green-light text-sos-green' },
              { name: 'Mahres', region: 'Sfax', programs: 2, color: 'border-sos-red', icon: 'bg-sos-red-light text-sos-red' },
              { name: 'Akouda', region: 'Sousse', programs: 3, color: 'border-sos-yellow', icon: 'bg-sos-yellow-light text-yellow-700' },
            ].map((v) => (
              <div key={v.name} className={`bg-white bubble shadow-card border-t-4 ${v.color} p-6 hover:shadow-card-hover transition-all`}>
                <div className={`w-10 h-10 rounded-lg ${v.icon} flex items-center justify-center mb-4`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-sos-gray-900">SOS Village de {v.name}</h3>
                <p className="text-sm text-sos-gray-500 mt-1">{v.region}, Tunisie</p>
                <p className="text-xs text-sos-gray-400 mt-2">{v.programs} programmes actifs</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sos-blue to-sos-blue-dark" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <SOSIcon className="w-16 h-16 text-white mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ensemble, protégeons l'enfance
          </h2>
          <p className="mt-4 text-lg text-blue-200 max-w-2xl mx-auto">
            Rejoignez notre réseau de professionnels engagés pour la protection et
            le bien-être des enfants en Tunisie.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-sos-blue font-bold text-sm
                         hover:bg-sos-gray-50 active:scale-[0.97] transition-all shadow-lg"
            >
              Se connecter à la plateforme
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-sos-gray-900 text-sos-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-sos-blue flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-bold text-white">SOS Safeguarding</span>
              </div>
              <p className="text-sm leading-relaxed">
                Plateforme de signalement et de protection de l'enfance — SOS Villages d'Enfants Tunisie.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Liens rapides</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-white transition">À propos</a></li>
                <li><a href="#services" className="hover:text-white transition">Services</a></li>
                <li><a href="#platform" className="hover:text-white transition">Plateforme</a></li>
                <li><Link to="/login" className="hover:text-white transition">Connexion</Link></li>
              </ul>
            </div>

            {/* Villages */}
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Nos villages</h4>
              <ul className="space-y-2 text-sm">
                <li>SOS Gammarth — Tunis</li>
                <li>SOS Siliana — Siliana</li>
                <li>SOS Mahres — Sfax</li>
                <li>SOS Akouda — Sousse</li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-sos-blue shrink-0" />
                  +216 71 234 567
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sos-blue shrink-0" />
                  contact@sos-tunisie.org
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-sos-blue shrink-0 mt-0.5" />
                  SOS Villages d'Enfants, Gammarth, Tunisie
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-sos-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>&copy; {new Date().getFullYear()} SOS Villages d'Enfants Tunisie. Tous droits réservés.</p>
            <p className="flex items-center gap-1">
              Développé avec <Heart className="w-3 h-3 text-sos-red" /> par <span className="font-bold text-white">SupBots</span> — Hack For Hope 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
