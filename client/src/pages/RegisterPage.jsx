import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import usePageMeta from '../hooks/usePageMeta';
import { getErrorMessage } from '../utils/apiError';
import AuthLayout from '../components/AuthLayout';

export default function RegisterPage() {
  usePageMeta({ title: 'Create your free account', description: 'Create a free Medora account for symptom guidance, urgent-risk triage and a personal health profile.' });
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    termsAccepted: false,
    healthDataConsent: false,
    cookieNoticeAccepted: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start getting clear health guidance in minutes.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div role="alert" className="bg-coral-soft text-coral-ink text-sm px-3 py-2.5 rounded-xl">{error}</div>}
        <div>
          <label htmlFor="register-name" className="block text-sm font-medium text-ink mb-1.5">Full name</label>
          <input
            id="register-name"
            required
            autoComplete="name"
            value={form.fullName}
            onChange={update('fullName')}
            className="field-input"
            placeholder="Achu Ransom"
          />
        </div>
        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            className="field-input"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="register-password" className="block text-sm font-medium text-ink mb-1.5">Password</label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              className="field-input pr-11"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-teal-deep"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-line bg-cloud p-3 text-sm text-ink">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              required
              checked={form.termsAccepted}
              onChange={(event) => setForm((current) => ({ ...current, termsAccepted: event.target.checked }))}
              className="mt-1 h-4 w-4 accent-teal-deep"
            />
            <span>
              I agree to the <Link to="/legal/terms" className="font-medium text-teal-deep underline">Terms of Use</Link> and have read the <Link to="/legal/privacy" className="font-medium text-teal-deep underline">Privacy Policy</Link>.
            </span>
          </label>
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              required
              checked={form.healthDataConsent}
              onChange={(event) => setForm((current) => ({ ...current, healthDataConsent: event.target.checked }))}
              className="mt-1 h-4 w-4 accent-teal-deep"
            />
            <span>
              I explicitly consent to Medora processing health information I choose to share. If optional Ollama is enabled, relevant information may be sent to its configured endpoint; if I use dictation, audio may be sent to my browser’s speech-recognition provider. See the <Link to="/legal/privacy" className="font-medium text-teal-deep underline">Privacy Policy</Link>.
            </span>
          </label>
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              required
              checked={form.cookieNoticeAccepted}
              onChange={(event) => setForm((current) => ({ ...current, cookieNoticeAccepted: event.target.checked }))}
              className="mt-1 h-4 w-4 accent-teal-deep"
            />
            <span>
              I understand Medora uses an essential sign-in cookie. See the <Link to="/legal/cookies" className="font-medium text-teal-deep underline">Cookie Policy</Link>.
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-deep text-white font-medium py-2.5 rounded-xl hover:bg-teal-mid transition-colors disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-center text-sm text-ink-soft mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-teal-deep font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
