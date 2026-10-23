import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, ArrowLeft, Check, Trash2, X, LogOut, Loader2, RefreshCw } from 'lucide-react';
import client from '../api/client';
import Sidebar from '../components/Sidebar';
import MemoryPanel from '../components/MemoryPanel';
import PreferencesPanel from '../components/PreferencesPanel';
import VitalsPanel from '../components/VitalsPanel';
import ChipInput from '../components/ChipInput';
import ProfileField from '../components/ProfileField';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/toastContext';
import usePageMeta from '../hooks/usePageMeta';
import { getErrorMessage } from '../utils/apiError';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PHONE_RE = /^[+()\d\s.-]{0,24}$/;
const EMPTY = {
  fullName: '',
  phone: '',
  city: '',
  region: '',
  dateOfBirth: '',
  sex: '',
  allergies: [],
  chronicConditions: [],
  currentMedications: [],
  bloodType: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

function toForm({ user, healthProfile }) {
  return {
    fullName: user.fullName || '',
    phone: user.phone || '',
    city: user.city || '',
    region: user.region || '',
    dateOfBirth: user.dateOfBirth || '',
    sex: user.sex || '',
    ...healthProfile,
  };
}

function validate(form) {
  const errors = {};
  if (form.fullName.trim().length < 2) errors.fullName = 'Please enter your full name.';
  if (!PHONE_RE.test(form.phone)) errors.phone = 'Use digits, spaces, + ( ) . - only.';
  if (!PHONE_RE.test(form.emergencyContactPhone)) errors.emergencyContactPhone = 'Use digits, spaces, + ( ) . - only.';
  if (form.dateOfBirth) {
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date() || dob.getFullYear() < 1900) errors.dateOfBirth = 'Enter a valid date in the past.';
  }
  return errors;
}

export default function ProfilePage() {
  usePageMeta({ title: 'Your profile', noindex: true });
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [form, setForm] = useState(EMPTY);
  const [baseline, setBaseline] = useState(EMPTY);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadProfile = useCallback(async () => {
    setStatus('loading');
    try {
      const { data } = await client.get('/users/me');
      const next = toForm(data);
      setForm(next);
      setBaseline(next);
      setStatus('ready');
    } catch (err) {
      setLoadError(getErrorMessage(err, "We couldn't load your profile."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
    client.get('/conversations').then(({ data }) => setConversations(data.conversations)).catch(() => {});
  }, [loadProfile]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);
  const errors = useMemo(() => validate(form), [form]);
  const visibleErrors = showErrors ? errors : {};

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Close the delete dialog with Escape.
  useEffect(() => {
    if (!showDeleteModal) return undefined;
    const onKey = (e) => e.key === 'Escape' && setShowDeleteModal(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDeleteModal]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e?.preventDefault();
    if (saving || !dirty) return;
    setShowErrors(true);
    if (Object.keys(errors).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await client.put('/users/me/profile', form);
      const next = toForm(data);
      setForm(next);
      setBaseline(next);
      updateUser(data.user);
      setShowErrors(false);
      toast.success('Profile saved.');
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const { data } = await client.post('/conversations');
      navigate(`/chat/${data.conversation.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't start a new chat."));
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    setDeleting(true);
    try {
      await client.delete('/users/me');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to delete your account. Please try again.'));
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-dvh bg-cloud">
      <Sidebar
        conversations={conversations}
        onNewChat={handleNewChat}
        onConversationUpdated={(c) => setConversations((prev) => prev.map((item) => (item.id === c.id ? c : item)))}
        onConversationDeleted={(id) => setConversations((prev) => prev.filter((item) => item.id !== id))}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white/85 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="-ml-1 rounded-lg p-2 text-ink-soft hover:bg-cloud md:hidden">
            <Menu size={22} />
          </button>
          <button type="button" onClick={() => navigate('/')} className="hidden items-center gap-1.5 text-sm text-ink-soft hover:text-teal-deep md:flex">
            <ArrowLeft size={16} /> Back to chat
          </button>
          <span className="font-display font-semibold text-teal-deep md:hidden">Profile</span>
        </header>

        <main id="main" className="mx-auto w-full max-w-2xl px-4 py-6 pb-32 sm:py-10">
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Your profile</h1>
          <p className="mb-6 mt-1.5 text-sm leading-relaxed text-ink-soft">
            Optional details help Medora personalize its guidance. If an AI model is configured for this app, relevant chat and profile details may be sent to it. See the{' '}
            <Link to="/legal/privacy" className="text-teal-deep underline underline-offset-2">Privacy Policy</Link>.
          </p>

          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-16 text-ink-soft" role="status">
              <Loader2 className="animate-spin" size={20} /> Loading your profile…
            </div>
          )}

          {status === 'error' && (
            <div className="card text-center" role="alert">
              <p className="text-sm text-coral-ink">{loadError}</p>
              <button type="button" onClick={loadProfile} className="btn btn-secondary mt-4">
                <RefreshCw size={16} /> Try again
              </button>
            </div>
          )}

          {status === 'ready' && (
            <form id="profile-form" onSubmit={handleSave} noValidate className="space-y-5">
              <section className="card" aria-labelledby="basic-heading">
                <h2 id="basic-heading" className="mb-4 text-base font-semibold text-ink">Basic information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ProfileField label="Full name" value={form.fullName} onChange={set('fullName')} error={visibleErrors.fullName} autoComplete="name" required />
                  <ProfileField label="Email" value={user?.email || ''} onChange={() => {}} readOnly hint="Email can't be changed here." autoComplete="email" />
                  <ProfileField label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={visibleErrors.phone} placeholder="+237 6 00 00 00 00" />
                  <ProfileField label="Date of birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} error={visibleErrors.dateOfBirth} max={new Date().toISOString().slice(0, 10)} autoComplete="bday" />
                  <ProfileField label="Sex" as="select" value={form.sex} onChange={set('sex')}>
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </ProfileField>
                  <ProfileField label="City" value={form.city} onChange={set('city')} autoComplete="address-level2" />
                  <ProfileField label="Region" value={form.region} onChange={set('region')} autoComplete="address-level1" />
                </div>
              </section>

              <section className="card" aria-labelledby="health-heading">
                <h2 id="health-heading" className="mb-1 text-base font-semibold text-ink">Health profile</h2>
                <p className="mb-4 text-xs text-ink-soft">Medora uses this to give safer, more relevant guidance.</p>
                <div className="space-y-4">
                  <ChipInput label="Allergies" values={form.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin, peanuts" />
                  <ChipInput label="Chronic conditions" values={form.chronicConditions} onChange={set('chronicConditions')} placeholder="e.g. Asthma, hypertension" />
                  <ChipInput label="Current medications" values={form.currentMedications} onChange={set('currentMedications')} placeholder="e.g. Metformin" />
                  <ProfileField label="Blood type" as="select" value={form.bloodType} onChange={set('bloodType')}>
                    <option value="">Not sure / prefer not to say</option>
                    {BLOOD_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </ProfileField>
                </div>
              </section>

              <section className="card" aria-labelledby="emergency-heading">
                <h2 id="emergency-heading" className="mb-4 text-base font-semibold text-ink">Emergency contact</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ProfileField label="Name" value={form.emergencyContactName} onChange={set('emergencyContactName')} autoComplete="off" />
                  <ProfileField label="Phone" type="tel" inputMode="tel" value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} error={visibleErrors.emergencyContactPhone} autoComplete="off" />
                </div>
              </section>
            </form>
          )}

          <div className="mt-10 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-ink">Preferences and history</h2>
              <p className="text-xs text-ink-soft">These save automatically when you change them.</p>
            </div>
            <PreferencesPanel />
            <MemoryPanel />
            <VitalsPanel />
          </div>

          <section className="card mt-10 space-y-5" aria-labelledby="account-heading">
            <h2 id="account-heading" className="text-base font-semibold text-ink">Account</h2>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">Sign out of Medora on this device.</p>
              <button type="button" onClick={logout} className="btn btn-secondary"><LogOut size={16} /> Sign out</button>
            </div>
            <div className="border-t border-line pt-5">
              <div className="flex items-start gap-3">
                <Trash2 size={18} className="mt-0.5 shrink-0 text-coral" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-ink">Delete account</h3>
                  <p className="mb-3 mt-1 text-xs text-ink-soft">Permanently delete your profile, conversations, health information and uploaded files.</p>
                  <button type="button" onClick={() => setShowDeleteModal(true)} disabled={deleting} className="btn btn-danger">
                    <Trash2 size={15} /> {deleting ? 'Deleting account…' : 'Delete my account'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        {status === 'ready' && dirty && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:left-auto md:right-0 md:w-[calc(100%-18rem)]">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
              <p className="hidden text-sm text-ink-soft sm:block" role="status">You have unsaved changes</p>
              <div className="flex w-full gap-2 sm:w-auto">
                <button type="button" onClick={() => { setForm(baseline); setShowErrors(false); }} disabled={saving} className="btn btn-secondary flex-1 whitespace-nowrap sm:flex-none">Discard</button>
                <button type="submit" form="profile-form" disabled={saving} className="btn btn-primary flex-[2] whitespace-nowrap sm:flex-none">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="delete-title" className="font-display text-xl font-semibold text-ink">Delete your account?</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">This permanently deletes your profile, all consultations, health information, memories and uploaded files. This can't be undone.</p>
              </div>
              <button type="button" onClick={() => setShowDeleteModal(false)} aria-label="Close" className="rounded-lg p-1 text-ink-soft hover:text-ink"><X size={18} /></button>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-secondary" autoFocus>Cancel</button>
              <button type="button" onClick={handleDeleteAccount} className="btn bg-coral-ink text-white hover:opacity-90">Delete account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
