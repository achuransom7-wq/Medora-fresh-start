import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Phone, MapPin, ArrowLeft } from 'lucide-react';
import client from '../api/client';
import Sidebar from '../components/Sidebar';
import { severityStyle } from '../components/SeverityBadge';

const STATUS_LABELS = {
  pending: 'Pending',
  contacted: 'Contacted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ReferralsPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([client.get('/conversations'), client.get('/referrals')]).then(
      ([convRes, refRes]) => {
        setConversations(convRes.data.conversations);
        setReferrals(refRes.data.referrals);
        setLoading(false);
      }
    );
  }, []);

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

  const updateStatus = async (id, status) => {
    await client.patch(`/referrals/${id}`, { status });
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

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
          <span className="font-display font-semibold text-teal-deep md:hidden">Referrals</span>
        </header>

        <div className="max-w-2xl mx-auto w-full px-4 py-8">
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Your referrals</h1>
          <p className="text-ink-soft text-sm mb-6">Doctors you've requested to connect with, based on your consultations.</p>

          {loading ? (
            <p className="text-ink-soft text-sm">Loading…</p>
          ) : referrals.length === 0 ? (
            <div className="bg-white border border-line rounded-2xl p-8 text-center">
              <p className="text-ink-soft text-sm">
                No referrals yet. When Medora recommends seeing a doctor, you'll be able to request a referral right from the chat.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((r) => {
                const s = severityStyle(r.severity);
                return (
                  <div key={r.id} className="bg-white border border-line rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-ink text-sm">{r.doctor_name}</p>
                        <p className="text-xs text-ink-soft mt-0.5">{r.specialty} · {r.clinic_name}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.bg} ${s.text} flex-shrink-0`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-ink-soft mb-3">
                      {r.doctor_phone && (
                        <a href={`tel:${r.doctor_phone}`} className="inline-flex items-center gap-1 text-teal-deep font-medium">
                          <Phone size={12} /> {r.doctor_phone}
                        </a>
                      )}
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(r.id, 'contacted')}
                          className="text-xs font-medium bg-mint text-teal-deep px-3 py-1.5 rounded-full hover:bg-mint-soft transition-colors"
                        >
                          Mark as contacted
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'cancelled')}
                          className="text-xs font-medium text-ink-soft hover:text-coral transition-colors px-3 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {r.status === 'contacted' && (
                      <button
                        onClick={() => updateStatus(r.id, 'completed')}
                        className="text-xs font-medium bg-mint text-teal-deep px-3 py-1.5 rounded-full hover:bg-mint-soft transition-colors"
                      >
                        Mark as completed
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
