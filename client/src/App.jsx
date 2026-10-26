import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import ToastProvider from './components/ToastProvider';
import ProtectedRoute from './components/ProtectedRoute';
import BrandMark from './components/BrandMark';

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
    <div className="flex min-h-dvh items-center justify-center bg-canvas" role="status" aria-label="Loading">
      <BrandMark size={48} className="animate-pulse" />
    </div>
  );
}

// Visitors see the public landing page at "/"; signed-in users go straight to their chat.
// Both "/" and "/chat/:id" use this one component so React keeps the chat page mounted while a
// new conversation is created. Otherwise the page would reset and lose the first reply.
function Home() {
  const { user, loading } = useAuth();
  const { id } = useParams();
  if (loading) return <Splash />;
  if (!user && !id) return <LandingPage />;
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
              <Route path="/chat/:id" element={<Home />} />
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
