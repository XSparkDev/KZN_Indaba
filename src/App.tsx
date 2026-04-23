import { useState } from 'react';
import KznRegistrationFlow from './components/kzn/KznRegistrationFlow';
import KznAdminAuthGate from './components/kzn/KznAdminAuthGate';
import KznLandingPage from './components/kzn/KznLandingPage';

export default function App() {
  const [showRegistration, setShowRegistration] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('register') === '1';
  });
  const [showKznAdmin, setShowKznAdmin] = useState(false);

  if (showKznAdmin) {
    return <KznAdminAuthGate onBack={() => setShowKznAdmin(false)} />;
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
