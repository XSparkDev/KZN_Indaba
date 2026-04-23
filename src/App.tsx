import { useState } from 'react';
import KznRegistrationFlow from './components/kzn/KznRegistrationFlow';
import KznAdminDashboard from './components/kzn/KznAdminDashboard';
import KznLandingPage from './components/kzn/KznLandingPage';

export default function App() {
  const [showRegistration, setShowRegistration] = useState(false);
  const [showKznAdmin, setShowKznAdmin] = useState(false);

  if (showKznAdmin) {
    return <KznAdminDashboard onBack={() => setShowKznAdmin(false)} />;
  }

  if (!showRegistration) {
    return (
      <div className="relative">
        <KznLandingPage onRegisterClick={() => setShowRegistration(true)} />
        <button
          type="button"
          onClick={() => setShowKznAdmin(true)}
          className="fixed bottom-4 right-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
        >
          Admin
        </button>
      </div>
    );
  }

  return <KznRegistrationFlow onClose={() => setShowRegistration(false)} />;
}
