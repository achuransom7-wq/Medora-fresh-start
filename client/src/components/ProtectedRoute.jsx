import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-cloud">
        <div className="w-10 h-10 rounded-2xl bg-teal-deep flex items-center justify-center animate-pulse">
          <span className="text-white font-display font-semibold">M</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const consentMissing = !user.terms_accepted_at || !user.health_data_consent_at || !user.cookie_notice_accepted_at;
  if (consentMissing && location.pathname !== '/consent') {
    return <Navigate to="/consent" replace state={{ from: location }} />;
  }

  return children;
}
