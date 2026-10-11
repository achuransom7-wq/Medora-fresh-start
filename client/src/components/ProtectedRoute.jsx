import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cloud">
        <div className="w-10 h-10 rounded-2xl bg-teal-deep flex items-center justify-center animate-pulse">
          <span className="text-white font-display font-semibold">M</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
