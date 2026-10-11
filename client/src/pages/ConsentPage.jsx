import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ConsentPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState({ termsAccepted: false, healthDataConsent: false, cookieNoticeAccepted: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (event) => setAccepted((current) => ({ ...current, [key]: event.target.checked }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await client.post('/users/me/consent', accepted);
      setUser((current) => ({ ...current, ...data.consent }));
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not save your choices. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout title="Review Medora policies" subtitle="Please review and choose before continuing to your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p role="alert" className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-coral-ink">{error}</p>}
        <div className="space-y-3 rounded-xl border border-line bg-cloud p-3 text-sm text-ink">
          <label className="flex items-start gap-2.5">
            <input type="checkbox" required checked={accepted.termsAccepted} onChange={update('termsAccepted')} className="mt-1 h-4 w-4 accent-teal-deep" />
            <span>I agree to the <Link to="/legal/terms" className="font-medium text-teal-deep underline">Terms of Use</Link> and have read the <Link to="/legal/privacy" className="font-medium text-teal-deep underline">Privacy Policy</Link>.</span>
          </label>
          <label className="flex items-start gap-2.5">
            <input type="checkbox" required checked={accepted.healthDataConsent} onChange={update('healthDataConsent')} className="mt-1 h-4 w-4 accent-teal-deep" />
            <span>I explicitly consent to Medora processing health information I choose to share. Relevant information may be sent to the configured AI provider; if I use dictation, audio may be sent to my browser’s speech-recognition provider. See the <Link to="/legal/privacy" className="font-medium text-teal-deep underline">Privacy Policy</Link>.</span>
          </label>
          <label className="flex items-start gap-2.5">
            <input type="checkbox" required checked={accepted.cookieNoticeAccepted} onChange={update('cookieNoticeAccepted')} className="mt-1 h-4 w-4 accent-teal-deep" />
            <span>I understand Medora uses an essential sign-in cookie. See the <Link to="/legal/cookies" className="font-medium text-teal-deep underline">Cookie Policy</Link>.</span>
          </label>
        </div>
        <button type="submit" disabled={saving} className="w-full rounded-xl bg-teal-deep py-2.5 font-medium text-white hover:bg-teal-mid disabled:opacity-60">
          {saving ? 'Saving…' : 'Accept and continue'}
        </button>
      </form>
    </AuthLayout>
  );
}
