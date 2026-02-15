import { useEffect, useState } from 'react';
import { 
  User, 
  MapPin, 
  Users, 
  PlusCircle, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  X,
  Calendar,
  Tag,
  Flag
} from 'lucide-react';
import { getProfile } from '../services/api';
import BackgroundPattern from './BackgroundPattern';

const STATUS_CONFIG = {
  EN_ATTENTE: { label: 'En attente', color: 'bg-sos-blue text-white', icon: Clock },
  EN_COURS: { label: 'En cours', color: 'bg-sos-blue text-white', icon: AlertCircle },
  CLOTURE: { label: 'Clôturé', color: 'bg-sos-green text-white', icon: CheckCircle },
  FAUX_SIGNALEMENT: { label: 'Faux signalement', color: 'bg-sos-coral text-white', icon: AlertCircle },
  ARCHIVE: { label: 'Archivé', color: 'bg-sos-gray-300 text-sos-navy', icon: FileText },
};

const INCIDENT_TYPE_LABELS = {
  VIOLENCE_PHYSIQUE: 'Violence physique',
  VIOLENCE_PSYCHOLOGIQUE: 'Violence psychologique',
  VIOLENCE_SEXUELLE: 'Violence sexuelle',
  NEGLIGENCE: 'Négligence',
  SANTE: 'Santé',
  COMPORTEMENT: 'Comportement',
  EDUCATION: 'Éducation',
  FAMILIAL: 'Problème familial',
  AUTRE: 'Autre',
};

const URGENCY_COLORS = {
  FAIBLE: 'border-l-sos-green',
  MOYEN: 'border-l-sos-blue',
  ELEVE: 'border-l-sos-blue',
  CRITIQUE: 'border-l-sos-coral',
};

const URGENCY_LABELS = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

function ProfileLandingPage({ onCreateSignalement }) {
  const [profile, setProfile] = useState(null);
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSignalement, setSelectedSignalement] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await getProfile();
      setProfile(data.user);
      setSignalements(data.signalements || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-sos-blue-lighter via-white to-sos-coral-light overflow-hidden flex items-center justify-center">
        <BackgroundPattern />
        <div className="relative z-10 flex items-center gap-3 text-sos-navy">
          <Loader2 className="w-6 h-6 animate-spin text-sos-blue" />
          <span className="text-sos-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-sos-blue-lighter via-white to-sos-coral-light overflow-hidden flex items-center justify-center p-4">
        <BackgroundPattern />
        <div className="relative z-10 bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl border border-sos-coral/20 p-6 max-w-md">
          <div className="flex items-center gap-3 text-sos-coral mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">Erreur</h3>
          </div>
          <p className="text-sm text-sos-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-sos-blue-lighter via-white to-sos-coral-light overflow-hidden py-10 px-4 sm:px-6 lg:px-8">
      <BackgroundPattern />
      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-sos-navy">
            Bienvenue, {profile?.name}
          </h1>
          <p className="mt-2 text-sm text-sos-gray-500">
            Tableau de bord — Niveau 1
          </p>
        </div>

        {/* Profile Card & Quick Action */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 bg-sos-blue-lighter shadow-sm rounded-2xl border border-sos-blue/10 p-7">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <User className="w-6 h-6 text-sos-blue" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-sos-navy">Mon Profil</h2>
                <p className="text-sm text-sos-gray-500">Informations personnelles</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Village/Programme */}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <MapPin className="w-5 h-5 text-sos-blue" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-sos-gray-500 uppercase tracking-wide">
                    Programme (Ville)
                  </p>
                  <p className="text-sm font-bold text-sos-navy mt-1">
                    {profile?.village?.name || 'Non assigné'}
                  </p>
                  {profile?.village?.location && (
                    <p className="text-xs text-sos-gray-500 mt-0.5">
                      {profile.village.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Children Count */}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <Users className="w-5 h-5 text-sos-blue" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-sos-gray-500 uppercase tracking-wide">
                    Enfants en charge
                  </p>
                  <p className="text-sm font-bold text-sos-navy mt-1">
                    {profile?.childrenCount || 0} enfant{profile?.childrenCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Role Details */}
              {profile?.roleDetails && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-sos-gray-500 uppercase tracking-wide">
                    Rôle
                  </p>
                  <p className="text-sm font-bold text-sos-navy mt-1">
                    {profile.roleDetails.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Card */}
          <div className="bg-gradient-to-br from-sos-blue via-sos-blue to-sos-blue-dark shadow-lg rounded-2xl p-7 text-white">
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Créer un signalement
                </h3>
                <p className="text-sm text-white/90 leading-relaxed">
                  Déclarez un nouvel incident ou préoccupation concernant un enfant.
                </p>
              </div>
              <button
                onClick={onCreateSignalement}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3.5 
                           bg-white text-sos-blue rounded-xl font-bold text-sm
                           hover:bg-white/95 hover:shadow-lg active:scale-[0.98] transition-all"
              >
                <PlusCircle className="w-5 h-5" />
                Nouveau Signalement
              </button>
            </div>
          </div>
        </div>

        {/* Previous Signalements */}
        <div className="bg-sos-gray-50 shadow-sm rounded-2xl border border-sos-gray-100 p-7">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-sos-navy">
                Mes Signalements
              </h2>
              <p className="text-sm text-sos-gray-500 mt-1">
                Historique de vos déclarations
              </p>
            </div>
            <span className="px-3.5 py-1.5 bg-sos-blue-light text-sos-blue rounded-full text-sm font-bold">
              {signalements.length}
            </span>
          </div>

          {signalements.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sos-blue-lighter flex items-center justify-center">
                <FileText className="w-8 h-8 text-sos-blue" />
              </div>
              <p className="text-sm text-sos-gray-600 mb-4">
                Vous n'avez pas encore créé de signalement
              </p>
              <button
                onClick={onCreateSignalement}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold
                           bg-sos-blue text-white rounded-xl hover:bg-sos-blue-dark transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Créer votre premier signalement
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {signalements.map((sig) => {
                const statusInfo = STATUS_CONFIG[sig.status] || STATUS_CONFIG.EN_ATTENTE;
                const StatusIcon = statusInfo.icon;
                const urgencyColor = URGENCY_COLORS[sig.urgencyLevel] || 'border-l-sos-gray-300';

                return (
                  <div
                    key={sig._id}
                    onClick={() => setSelectedSignalement(sig)}
                    className={`border-l-4 ${urgencyColor} bg-white rounded-xl p-5 
                               hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer border border-sos-gray-100`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-bold text-sos-navy truncate">
                            {sig.title || 'Sans titre'}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full 
                                          text-xs font-semibold ${statusInfo.color} shrink-0`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-sos-gray-600 line-clamp-2 mb-3 leading-relaxed">
                          {sig.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sos-gray-500">
                          {sig.incidentType && (
                            <span>
                              Type: {INCIDENT_TYPE_LABELS[sig.incidentType] || sig.incidentType}
                            </span>
                          )}
                          {sig.village?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {sig.village.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-sos-gray-500">
                          {formatDate(sig.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal for Signalement Details */}
      {selectedSignalement && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in backdrop-blur-sm"
          onClick={() => setSelectedSignalement(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-sos-blue-lighter to-white border-b border-sos-blue-light/30 px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-sos-navy">
                  {selectedSignalement.title || 'Signalement sans titre'}
                </h2>
                <p className="text-sm text-sos-gray-600 mt-1">
                  Créé le {formatDate(selectedSignalement.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSignalement(null)}
                className="ml-4 p-2 rounded-xl hover:bg-white/80 transition-all"
              >
                <X className="w-5 h-5 text-sos-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Status & Urgency */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-sos-blue-lighter px-4 py-2 rounded-xl">
                  <span className="text-sm font-semibold text-sos-navy">Statut:</span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    (STATUS_CONFIG[selectedSignalement.status] || STATUS_CONFIG.EN_ATTENTE).color
                  }`}>
                    {(STATUS_CONFIG[selectedSignalement.status] || STATUS_CONFIG.EN_ATTENTE).label}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-sos-blue-lighter px-4 py-2 rounded-xl">
                  <Flag className="w-4 h-4 text-sos-blue" />
                  <span className="text-sm font-semibold text-sos-navy">Urgence:</span>
                  <span className="text-sm font-bold text-sos-navy">
                    {URGENCY_LABELS[selectedSignalement.urgencyLevel] || selectedSignalement.urgencyLevel}
                  </span>
                </div>
              </div>

              {/* Village & Program */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedSignalement.village && (
                  <div className="flex items-start gap-3 bg-white border border-sos-blue-light/30 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-xl bg-sos-blue-lighter flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-sos-blue" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-sos-gray-500 uppercase">Village</p>
                      <p className="text-sm font-bold text-sos-navy mt-1">
                        {selectedSignalement.village.name}
                      </p>
                    </div>
                  </div>
                )}
                {selectedSignalement.program && (
                  <div className="flex items-start gap-3 bg-white border border-sos-blue-light/30 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-xl bg-sos-blue-lighter flex items-center justify-center shrink-0">
                      <Tag className="w-5 h-5 text-sos-blue" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-sos-gray-500 uppercase">Programme</p>
                      <p className="text-sm font-bold text-sos-navy mt-1">
                        {selectedSignalement.program}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Incident Type */}
              {selectedSignalement.incidentType && (
                <div>
                  <p className="text-xs font-semibold text-sos-gray-500 uppercase mb-3">Type d'incident</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-sos-blue-lighter border border-sos-blue-light/40 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-sos-blue" />
                    <span className="text-sm font-semibold text-sos-navy">
                      {INCIDENT_TYPE_LABELS[selectedSignalement.incidentType] || selectedSignalement.incidentType}
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-sos-gray-500 uppercase mb-3">Description</p>
                <div className="bg-sos-blue-lighter/50 rounded-xl p-4 border border-sos-blue-light/30">
                  <p className="text-sm text-sos-navy leading-relaxed whitespace-pre-wrap">
                    {selectedSignalement.description}
                  </p>
                </div>
              </div>

              {/* Child Name (always visible) */}
              {selectedSignalement.childName && (
                <div>
                  <p className="text-xs font-semibold text-sos-gray-500 uppercase mb-2">Nom de l'enfant</p>
                  <p className="text-sm font-bold text-sos-navy">
                    {selectedSignalement.childName}
                  </p>
                </div>
              )}

              {/* Abuser Name (always visible) */}
              {selectedSignalement.abuserName && (
                <div>
                  <p className="text-xs font-semibold text-sos-gray-500 uppercase mb-2">Agresseur présumé</p>
                  <p className="text-sm font-bold text-sos-navy">
                    {selectedSignalement.abuserName}
                  </p>
                </div>
              )}

              {/* Anonymous Badge */}
              {selectedSignalement.isAnonymous && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">
                    Signalement anonyme — Identité du déclarant protégée
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gradient-to-r from-sos-blue-lighter to-white border-t border-sos-blue-light/30 px-6 py-4 rounded-b-3xl">
              <button
                onClick={() => setSelectedSignalement(null)}
                className="w-full px-4 py-3 bg-sos-blue text-white rounded-xl font-semibold 
                         hover:bg-sos-blue-dark hover:shadow-lg transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileLandingPage;
