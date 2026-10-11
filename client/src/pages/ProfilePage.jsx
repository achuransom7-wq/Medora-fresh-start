import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ArrowLeft, Check, Trash2, X } from 'lucide-react';
import client from '../api/client';
import Sidebar from '../components/Sidebar';
import MemoryPanel from '../components/MemoryPanel';
import PreferencesPanel from '../components/PreferencesPanel';
import VitalsPanel from '../components/VitalsPanel';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', city: '', region: '' });
  const [health, setHealth] = useState({
    allergies: '',
    chronicConditions: '',
    currentMedications: '',
    bloodType: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useEffect(() => {
    client.get('/conversations').then(({ data }) => setConversations(data.conversations));
    client.get('/users/me').then(({ data }) => {
      setForm({
        fullName: data.user.full_name || '',
        phone: data.user.phone || '',
        city: data.user.city || '',
        region: data.user.region || '',
      });
      const hp = data.healthProfile;
      if (hp) {
        setHealth({
          allergies: parseJsonArray(hp.allergies),
          chronicConditions: parseJsonArray(hp.chronic_conditions),
          currentMedications: parseJsonArray(hp.current_medications),
          bloodType: hp.blood_type || '',
          emergencyContactName: hp.emergency_contact_name || '',
          emergencyContactPhone: hp.emergency_contact_phone || '',
        });
      }
    });
  }, []);

  function parseJsonArray(str) {
    if (!str) return '';
    try {
      return JSON.parse(str).join(', ');
    } catch {
      return '';
    }
  }

  const handleNewChat = async () => {
    const { data } = await client.post('/conversations');
    navigate(`/chat/${data.conversation.id}`);
  };

  const updateConversation = (conversation) => {
    setConversations((prev) => prev.map((item) => (item.id === conversation.id ? conversation : item)));
  };

  const removeConversation = (conversationId) => {
    setConversations((prev) => prev.filter((item) => item.id !== conversationId));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const { data } = await client.patch('/users/me', form);
    setUser((u) => ({ ...u, fullName: data.user.full_name, city: data.user.city }));

    await client.put('/users/me/health-profile', {
      allergies: splitCsv(health.allergies),
      chronicConditions: splitCsv(health.chronicConditions),
      currentMedications: splitCsv(health.currentMedications),
      bloodType: health.bloodType,
      emergencyContactName: health.emergencyContactName,
      emergencyContactPhone: health.emergencyContactPhone,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleting(true);
    try {
      await client.delete('/users/me');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Unable to delete your account. Please try again.');
      setDeleting(false);
    }
  };

  function splitCsv(str) {
    return str
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return (
    <div className="flex h-full bg-cloud">
      <Sidebar
        conversations={conversations}
        onNewChat={handleNewChat}
        onConversationUpdated={updateConversation}
        onConversationDeleted={removeConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-line bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="md:hidden text-ink-soft">
            <Menu size={22} />
          </button>
          <button onClick={() => navigate('/')} className="hidden md:flex items-center gap-1.5 text-sm text-ink-soft hover:text-teal-deep">
            <ArrowLeft size={16} /> Back to chat
          </button>
          <span className="font-display font-semibold text-teal-deep md:hidden">Profile</span>
        </header>

        <div className="max-w-2xl mx-auto w-full px-4 py-8">
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Your profile</h1>
          <p className="text-ink-soft text-sm mb-6">
            This helps Medora give you more relevant guidance. It's never shared without your consent.
          </p>

          <form id="profile-details-form" onSubmit={handleSave} className="space-y-6">
            <section className="bg-white border border-line rounded-2xl p-5">
              <h2 className="font-semibold text-ink text-sm mb-4">Basic information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
                <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label="Region" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
              </div>
            </section>

            <section className="bg-white border border-line rounded-2xl p-5">
              <h2 className="font-semibold text-ink text-sm mb-1">Health profile</h2>
              <p className="text-xs text-ink-soft mb-4">Separate multiple entries with commas.</p>
              <div className="space-y-4">
                <Field label="Allergies" value={health.allergies} onChange={(v) => setHealth({ ...health, allergies: v })} placeholder="e.g. Penicillin, peanuts" />
                <Field label="Chronic conditions" value={health.chronicConditions} onChange={(v) => setHealth({ ...health, chronicConditions: v })} placeholder="e.g. Asthma, hypertension" />
                <Field label="Current medications" value={health.currentMedications} onChange={(v) => setHealth({ ...health, currentMedications: v })} placeholder="e.g. Metformin" />
                <Field label="Blood type" value={health.bloodType} onChange={(v) => setHealth({ ...health, bloodType: v })} placeholder="e.g. O+" />
              </div>
            </section>

            <section className="bg-white border border-line rounded-2xl p-5">
              <h2 className="font-semibold text-ink text-sm mb-4">Emergency contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name" value={health.emergencyContactName} onChange={(v) => setHealth({ ...health, emergencyContactName: v })} />
                <Field label="Phone" value={health.emergencyContactPhone} onChange={(v) => setHealth({ ...health, emergencyContactPhone: v })} />
              </div>
            </section>

          </form>

          <div className="space-y-6 mt-6">
            <PreferencesPanel />
            <MemoryPanel />
            <VitalsPanel />
          </div>

          <button
            type="submit"
            form="profile-details-form"
            className="mt-6 inline-flex items-center gap-2 bg-teal-deep text-white font-medium px-5 py-2.5 rounded-xl hover:bg-teal-mid transition-colors"
          >
            {saved ? <Check size={16} /> : null}
            {saved ? 'Saved' : 'Save changes'}
          </button>

          <section className="mt-8 border border-coral/30 bg-coral-soft/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Trash2 size={18} className="text-coral mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-ink text-sm">Delete account</h2>
                <p className="text-xs text-ink-soft mt-1 mb-3">
                  Permanently delete your profile, conversations, health information, and uploaded files.
                </p>
                {deleteError && <p className="text-xs text-coral mb-3">{deleteError}</p>}
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(true)}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 border border-coral text-coral font-medium text-sm px-3.5 py-2 rounded-lg hover:bg-coral hover:text-white transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {deleting ? 'Deleting account...' : 'Delete my account'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="w-full max-w-md rounded-2xl border border-coral/30 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="delete-account-title" className="font-display text-xl font-semibold text-ink">Delete your account?</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">This permanently deletes your profile, all consultations, health information, memories, and uploaded files. This action cannot be undone.</p>
              </div>
              <button type="button" onClick={() => setShowDeleteAccountModal(false)} aria-label="Close confirmation" className="p-1 text-ink-soft hover:text-ink"><X size={18} /></button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowDeleteAccountModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:bg-cloud">Cancel</button>
              <button type="button" onClick={() => { setShowDeleteAccountModal(false); handleDeleteAccount(); }} className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral/90">Delete account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-soft mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-line bg-cloud focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-mid text-sm"
      />
    </div>
  );
}
