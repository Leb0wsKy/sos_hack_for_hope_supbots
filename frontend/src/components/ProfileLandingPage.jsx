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

const STATUS_CONFIG = {
  EN_ATTENTE: { label: 'En attente', color: 'bg-sos-yellow text-sos-gray-900', icon: Clock },
  EN_COURS: { label: 'En cours', color: 'bg-sos-blue text-white', icon: AlertCircle },
  CLOTURE: { label: 'Clôturé', color: 'bg-sos-green text-white', icon: CheckCircle },
  FAUX_SIGNALEMENT: { label: 'Faux signalement', color: 'bg-sos-red text-white', icon: AlertCircle },
  ARCHIVE: { label: 'Archivé', color: 'bg-sos-gray-300 text-sos-gray-700', icon: FileText },
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
  MOYEN: 'border-l-sos-yellow',
  ELEVE: 'border-l-orange-500',
  CRITIQUE: 'border-l-sos-red',
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
      <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sos-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50 flex items-center justify-center p-4">
        <div className="bg-white shadow-card rounded-xl border border-sos-red/20 p-6 max-w-md">
          <div className="flex items-center gap-3 text-sos-red mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">Erreur</h3>
          </div>
          <p className="text-sm text-sos-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-sos-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-sos-gray-900">
            Bienvenue, {profile?.name}
          </h1>
          <p className="mt-1 text-sm text-sos-gray-500">
            Tableau de bord — Niveau 1
          </p>
        </div>

        {/* Profile Card & Quick Action */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 bg-white shadow-card rounded-xl border border-sos-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-sos-blue-light flex items-center justify-center">
                <User className="w-6 h-6 text-sos-blue" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-sos-gray-900">Mon Profil</h2>
                <p className="text-sm text-sos-gray-500">Informations personnelles</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Village/Programme */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-sos-green-light flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-sos-green" />
                </div>
                <div>
                  <p className="text-xs font-medium text-sos-gray-500 uppercase tracking-wide">
                    Programme (Ville)
                  </p>
                  <p className="text-sm font-semibold text-sos-gray-900 mt-1">
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
                <div className="w-10 h-10 rounded-lg bg-sos-yellow-light flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-sos-yellow" />
                </div>
                <div>
                  <p className="text-xs font-medium text-sos-gray-500 uppercase tracking-wide">
                    Enfants en charge
                  </p>
                  <p className="text-sm font-semibold text-sos-gray-900 mt-1">
                    {profile?.childrenCount || 0} enfant{profile?.childrenCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Role Details */}
              {profile?.roleDetails && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-sos-gray-500 uppercase tracking-wide">
                    Rôle
                  </p>
                  <p className="text-sm font-semibold text-sos-gray-900 mt-1">
                    {profile.roleDetails.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Card */}
          <div className="bg-gradient-to-br from-sos-blue to-sos-blue-dark shadow-card rounded-xl border border-sos-blue/20 p-6 text-white">
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <FileText className="w-10 h-10 mb-4 opacity-90" />
                <h3 className="text-lg font-semibold mb-2">
                  Créer un signalement
                </h3>
                <p className="text-sm opacity-90">
                  Déclarez un nouvel incident ou préoccupation concernant un enfant.
                </p>
              </div>
              <button
                onClick={onCreateSignalement}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 
                           bg-white text-sos-blue rounded-xl font-semibold text-sm
                           hover:bg-sos-gray-50 active:scale-[0.98] transition-all shadow-sm"
              >
                <PlusCircle className="w-5 h-5" />
                Nouveau Signalement
              </button>
            </div>
          </div>
        </div>

        {/* Previous Signalements */}
        <div className="bg-white shadow-card rounded-xl border border-sos-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-sos-gray-900">
                Mes Signalements
              </h2>
              <p className="text-sm text-sos-gray-500 mt-1">
                Historique de vos déclarations
              </p>
            </div>
            <span className="px-3 py-1 bg-sos-blue-light text-sos-blue rounded-full text-sm font-medium">
              {signalements.length} total
            </span>
          </div>

          {signalements.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-sos-gray-300 mb-3" />
              <p className="text-sm text-sos-gray-500">
                Vous n'avez pas encore créé de signalement
              </p>
              <button
                onClick={onCreateSignalement}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                           text-sos-blue hover:text-sos-blue-dark transition"
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
                    className={`border-l-4 ${urgencyColor} bg-sos-gray-50 rounded-lg p-4 
                               hover:shadow-md hover:bg-white transition-all cursor-pointer`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-sos-gray-900 truncate">
                            {sig.title || 'Sans titre'}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full 
                                          text-xs font-medium ${statusInfo.color} shrink-0`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-sos-gray-600 line-clamp-2 mb-2">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
          onClick={() => setSelectedSignalement(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-sos-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-sos-gray-900">
                  {selectedSignalement.title || 'Signalement sans titre'}
                </h2>
                <p className="text-sm text-sos-gray-500 mt-1">
                  Créé le {formatDate(selectedSignalement.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSignalement(null)}
                className="ml-4 p-2 rounded-lg hover:bg-sos-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-sos-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Status & Urgency */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-sos-gray-600">Statut:</span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    (STATUS_CONFIG[selectedSignalement.status] || STATUS_CONFIG.EN_ATTENTE).color
                  }`}>
                    {(STATUS_CONFIG[selectedSignalement.status] || STATUS_CONFIG.EN_ATTENTE).label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-sos-gray-500" />
                  <span className="text-sm font-medium text-sos-gray-600">Urgence:</span>
                  <span className="text-sm font-semibold text-sos-gray-900">
                    {URGENCY_LABELS[selectedSignalement.urgencyLevel] || selectedSignalement.urgencyLevel}
                  </span>
                </div>
              </div>

              {/* Village & Program */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedSignalement.village && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-sos-blue shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-sos-gray-500 uppercase">Village</p>
                      <p className="text-sm font-semibold text-sos-gray-900 mt-0.5">
                        {selectedSignalement.village.name}
                      </p>
                    </div>
                  </div>
                )}
                {selectedSignalement.program && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-sos-green shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-sos-gray-500 uppercase">Programme</p>
                      <p className="text-sm font-semibold text-sos-gray-900 mt-0.5">
                        {selectedSignalement.program}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Incident Type */}
              {selectedSignalement.incidentType && (
                <div>
                  <p className="text-xs font-medium text-sos-gray-500 uppercase mb-2">Type d'incident</p>
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-sos-blue-light rounded-lg">
                    <AlertCircle className="w-4 h-4 text-sos-blue" />
                    <span className="text-sm font-medium text-sos-blue">
                      {INCIDENT_TYPE_LABELS[selectedSignalement.incidentType] || selectedSignalement.incidentType}
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-xs font-medium text-sos-gray-500 uppercase mb-2">Description</p>
                <div className="bg-sos-gray-50 rounded-lg p-4 border border-sos-gray-200">
                  <p className="text-sm text-sos-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedSignalement.description}
                  </p>
                </div>
              </div>

              {/* Child Name (if not anonymous) */}
              {selectedSignalement.childName && !selectedSignalement.isAnonymous && (
                <div>
                  <p className="text-xs font-medium text-sos-gray-500 uppercase mb-2">Nom de l'enfant</p>
                  <p className="text-sm font-semibold text-sos-gray-900">
                    {selectedSignalement.childName}
                  </p>
                </div>
              )}

              {/* Abuser Name (if not anonymous) */}
              {selectedSignalement.abuserName && !selectedSignalement.isAnonymous && (
                <div>
                  <p className="text-xs font-medium text-sos-gray-500 uppercase mb-2">Agresseur présumé</p>
                  <p className="text-sm font-semibold text-sos-gray-900">
                    {selectedSignalement.abuserName}
                  </p>
                </div>
              )}

              {/* Anonymous Badge */}
              {selectedSignalement.isAnonymous && (
                <div className="flex items-center gap-2 px-4 py-3 bg-sos-yellow-light border border-sos-yellow/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-sos-yellow" />
                  <span className="text-sm font-medium text-sos-gray-700">
                    Signalement anonyme - Identités protégées
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-sos-gray-50 border-t border-sos-gray-200 px-6 py-4 rounded-b-2xl">
              <button
                onClick={() => setSelectedSignalement(null)}
                className="w-full px-4 py-2.5 bg-sos-blue text-white rounded-lg font-medium 
                         hover:bg-sos-blue-dark transition-colors"
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
