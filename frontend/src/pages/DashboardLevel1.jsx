import { useState } from 'react';
import ProfileLandingPage from '../components/ProfileLandingPage';
import SignalementForm from '../components/SignalementForm';

/* ──────────────────────────────────────────────── */
/*  Level 1 Dashboard — Landing Page & Form        */
/* ──────────────────────────────────────────────── */
function DashboardLevel1() {
  const [showForm, setShowForm] = useState(false);

  const handleCreateSignalement = () => {
    setShowForm(true);
  };

  const handleBackToLanding = () => {
    setShowForm(false);
  };

  const handleSuccess = () => {
    // Go back to landing page after successful submission
    setShowForm(false);
  };

  if (showForm) {
    return (
      <SignalementForm 
        onBack={handleBackToLanding} 
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <ProfileLandingPage onCreateSignalement={handleCreateSignalement} />
  );
}

export default DashboardLevel1;
