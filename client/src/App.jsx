import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import ToastProvider from './components/ToastProvider';
import ProtectedRoute from './components/ProtectedRoute';

// Each page is its own chunk, so the first visit downloads far less code.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ReferralsPage = lazy(() => import('./pages/ReferralsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const ConsentPage = lazy(() => import('./pages/ConsentPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cloud" role="status" aria-label="Loading">
      <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-2xl bg-teal-deep">
        <span className="font-display font-semibold text-white">M</span>
      </div>
    </div>
  );
}

// Visitors see the public landing page; signed-in users go straight to their chat.
function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <LandingPage />;
  return (
    <ProtectedRoute>
      <ChatPage />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <a href="#main" className="skip-link">Skip to main content</a>
          <Suspense fallback={<Splash />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/consent" element={<ProtectedRoute><ConsentPage /></ProtectedRoute>} />
              <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
