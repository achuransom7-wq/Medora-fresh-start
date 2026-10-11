import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu, ShieldAlert, FileDown, Volume2, VolumeX } from 'lucide-react';
import { jsPDF } from 'jspdf';
import client from '../api/client';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import ReferralCard from '../components/ReferralCard';
import ResearchPanel from '../components/ResearchPanel';

function downloadSummaryPdf(summary, fileName) {
  const document = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 52;
  const contentWidth = pageWidth - margin * 2;
  let y = 58;

  const addPageNumber = () => {
    document.setFont('helvetica', 'normal');
    document.setFontSize(9);
    document.setTextColor(110, 125, 120);
    document.text(`Medora consultation summary  |  ${document.getNumberOfPages()}`, pageWidth - margin, pageHeight - 28, { align: 'right' });
  };

  const ensureSpace = (height) => {
    if (y + height > pageHeight - 48) {
      addPageNumber();
      document.addPage();
      y = 58;
    }
  };

  document.setTextColor(26, 46, 43);
  summary.split('\n').forEach((sourceLine) => {
    const line = sourceLine
      .replace(/^#+\s*/, '')
      .replace(/^[-*]\s+/, '- ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/—/g, '-')
      .replace(/…/g, '...');
    const isHeading = /^#{1,6}\s/.test(sourceLine);
    const isTitle = /^#\s/.test(sourceLine);
    const fontSize = isTitle ? 20 : isHeading ? 13 : 10.5;
    const lineHeight = isTitle ? 27 : isHeading ? 19 : 15;
    const gapBefore = isTitle ? 0 : isHeading ? 10 : line ? 2 : 5;
    const wrapped = line ? document.splitTextToSize(line, contentWidth) : [''];

    ensureSpace(gapBefore + wrapped.length * lineHeight);
    y += gapBefore;
    document.setFont('helvetica', isHeading ? 'bold' : 'normal');
    document.setFontSize(fontSize);
    document.setTextColor(26, 46, 43);
    document.text(wrapped, margin, y);
    y += wrapped.length * lineHeight;
  });

  addPageNumber();
  document.save(`${fileName}.pdf`);
}

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [referralSuggestion, setReferralSuggestion] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [researchTarget, setResearchTarget] = useState(null);
  const scrollRef = useRef(null);
  const messageRefs = useRef({});

  const loadConversations = useCallback(async () => {
    const { data } = await client.get('/conversations');
    setConversations(data.conversations);
  }, []);

  useEffect(() => {
    loadConversations();
    client.get('/preferences').then(({ data }) => setPreferences(data.preferences)).catch(() => {});
  }, [loadConversations]);

  useEffect(() => {
    setReferralSuggestion(null);
    setResearchTarget(null);
    if (!id) {
      setMessages([]);
      return;
    }
    setLoadingConversation(true);
    client
      .get(`/conversations/${id}`)
      .then(({ data }) => setMessages(data.messages))
      .catch(() => navigate('/'))
      .finally(() => setLoadingConversation(false));
  }, [id, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  // Voice mode: read the latest assistant reply aloud if the patient has that preference on
  const speakLatestReply = useCallback(
    (text) => {
      if (!preferences?.auto_speak_replies || typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = preferences.language === 'fr' ? 'fr-FR' : 'en-US';
      window.speechSynthesis.speak(utterance);
    },
    [preferences]
  );

  const toggleAutoSpeak = async () => {
    const next = !preferences?.auto_speak_replies;
    setPreferences((p) => ({ ...p, auto_speak_replies: next }));
    if (!next && window.speechSynthesis) window.speechSynthesis.cancel();
    try {
      await client.put('/preferences', { autoSpeakReplies: next });
    } catch {
      // non-fatal
    }
  };

  const handleNewChat = async () => {
    const { data } = await client.post('/conversations');
    setConversations((prev) => [data.conversation, ...prev]);
    navigate(`/chat/${data.conversation.id}`);
  };

  const updateConversation = (conversation) => {
    setConversations((prev) => prev.map((item) => (item.id === conversation.id ? conversation : item)));
  };

  const removeConversation = (conversationId) => {
    setConversations((prev) => prev.filter((item) => item.id !== conversationId));
  };

  const handleSend = async (content, files = []) => {
    let conversationId = id;

    if (!conversationId) {
      const { data } = await client.post('/conversations');
      conversationId = data.conversation.id;
      setConversations((prev) => [data.conversation, ...prev]);
      navigate(`/chat/${conversationId}`, { replace: true });
    }

    const optimisticUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      attachments: files.map((f) => ({ kind: f.type.startsWith('image/') ? 'image' : 'document', original_name: f.name })),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setSending(true);
    setReferralSuggestion(null);

    try {
      const formData = new FormData();
      formData.append('content', content);
      files.forEach((f) => formData.append('files', f));

      // Don't set Content-Type manually — the browser needs to add its own multipart boundary.
      const { data } = await client.post(`/conversations/${conversationId}/messages`, formData);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUserMsg.id),
        data.userMessage,
        data.assistantMessage,
      ]);
      if (data.referralSuggestion) setReferralSuggestion(data.referralSuggestion);
      speakLatestReply(data.assistantMessage.content);
      loadConversations();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: err.response?.data?.error || 'Something went wrong. Please try again.',
          severity: null,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleBookReferral = async (doctor) => {
    if (!id || !referralSuggestion) return;
    setBookingId(doctor.id);
    try {
      const severity = messages[messages.length - 1]?.severity || 'see_doctor';
      await client.post('/referrals', {
        conversationId: id,
        doctorId: doctor.id,
        severity: severity === 'urgent' ? 'urgent' : 'see_doctor',
        reason: `Referral requested from consultation`,
      });
      navigate('/referrals');
    } catch (err) {
      // silent fail is acceptable here with a fallback alert-free UX; could add toast
    } finally {
      setBookingId(null);
    }
  };

  const handleAgentFeedback = async (diseaseName, outcome) => {
    if (!id) return;
    await client.post('/local-agent/feedback', { conversationId: id, diseaseName, outcome });
  };

  const handleExportSummary = async () => {
    if (!id) return;
    setSummaryLoading(true);
    try {
      const { data } = await client.get(`/conversations/${id}/summary`);
      downloadSummaryPdf(data.summary, `medora-consultation-summary-${id.slice(0, 8)}`);
    } catch (err) {
      // no-op — could surface a toast
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDownloadThreadSummary = async (project) => {
    const { data } = await client.get(`/projects/${project.id}/summary`);
    const safeTitle = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    downloadSummaryPdf(data.summary, `medora-consultation-thread-${safeTitle || project.id.slice(0, 8)}`);
  };

  const isUrgent = messages[messages.length - 1]?.severity === 'urgent';
  const hasVoiceSupport = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const userPrompts = messages.filter((message) => message.role === 'user');

  const jumpToPrompt = (messageId) => {
    messageRefs.current[messageId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex h-full bg-cloud">
      <Sidebar
        conversations={conversations}
        onNewChat={handleNewChat}
        onConversationUpdated={updateConversation}
        onConversationDeleted={removeConversation}
        onDownloadThreadSummary={handleDownloadThreadSummary}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-line bg-white/80 backdrop-blur-sm">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="text-ink-soft md:hidden">
            <Menu size={22} />
          </button>
          <span className="font-display font-semibold text-teal-deep md:hidden">Medora</span>
          <div className="flex-1" />
          {hasVoiceSupport && (
            <button
              onClick={toggleAutoSpeak}
              aria-label={preferences?.auto_speak_replies ? 'Turn off spoken replies' : 'Turn on spoken replies'}
              title={preferences?.auto_speak_replies ? 'Spoken replies: on' : 'Spoken replies: off'}
              className={`p-2 rounded-lg transition-colors ${
                preferences?.auto_speak_replies ? 'text-teal-deep bg-mint-soft' : 'text-ink-soft hover:bg-cloud'
              }`}
            >
              {preferences?.auto_speak_replies ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          {id && messages.length > 0 && (
            <button
              onClick={handleExportSummary}
              disabled={summaryLoading}
              className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-teal-deep px-2.5 py-1.5 rounded-lg hover:bg-cloud transition-colors disabled:opacity-50"
            >
              <FileDown size={16} />
              {summaryLoading ? 'Preparing…' : 'Consultation summary'}
            </button>
          )}
        </header>

        {isUrgent && (
          <div className="bg-coral text-white px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <span>This may be urgent. If you're in danger, go to the nearest hospital or call emergency services now.</span>
          </div>
        )}

        {/* Message area */}
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
          {!id && messages.length === 0 ? (
            <EmptyState onSend={handleSend} />
          ) : (
            <div className="max-w-4xl mx-auto px-6 md:px-12 py-8 space-y-8">
              {loadingConversation ? (
                <p className="text-center text-ink-soft text-sm py-10">Loading…</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} ref={(element) => { messageRefs.current[m.id] = element; }}>
                    <ChatMessage
                      message={m}
                      onLearnMore={m.role === 'assistant' ? () => setResearchTarget({ messageId: m.id, text: m.content }) : null}
                      onFeedback={m.role === 'assistant' ? handleAgentFeedback : null}
                      researchPanel={researchTarget?.messageId === m.id ? (
                        <ResearchPanel
                          seedText={researchTarget.text}
                          conversationId={id}
                          onClose={() => setResearchTarget(null)}
                        />
                      ) : null}
                    />
                  </div>
                ))
              )}
              {sending && <TypingIndicator />}
              {referralSuggestion && (
                <ReferralCard
                  suggestion={referralSuggestion}
                  onBook={handleBookReferral}
                  bookingId={bookingId}
                />
              )}
            </div>
          )}
          {userPrompts.length > 0 && (
            <nav className="hidden lg:flex fixed right-5 top-1/2 z-10 -translate-y-1/2 flex-col items-end gap-2" aria-label="Jump to prompt">
              {userPrompts.map((prompt, index) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => jumpToPrompt(prompt.id)}
                  title={`Prompt ${index + 1}: ${prompt.content}`}
                  aria-label={`Jump to prompt ${index + 1}`}
                  className="group flex h-3 w-7 items-center justify-end"
                >
                  <span className="h-0.5 w-6 rounded-full bg-ink-soft/35 transition-all group-hover:w-7 group-hover:bg-teal-deep" />
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Input area */}
        {(id || messages.length > 0) && (
          <div className="border-t border-line bg-white/60 backdrop-blur-sm px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <ChatInput onSend={handleSend} disabled={sending} />
              <p className="text-xs text-ink-soft/70 text-center mt-2">
                Medora provides general guidance, not a medical diagnosis. In an emergency, seek in-person care immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onSend }) {
  const suggestions = [
    "I've had a headache for two days",
    'My child has a mild fever',
    "I've had a sore throat since yesterday",
    'I feel dizzy when I stand up quickly',
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 text-center">
      {/* <div className="w-14 h-14 rounded-2xl bg-teal-deep flex items-center justify-center mb-5">
        <span className="text-white font-display font-semibold text-2xl">M</span>
      </div> */}
      <h1 className="font-display text-3xl font-semibold text-ink mb-2">How are you feeling today?</h1>
      <p className="text-ink-soft max-w-md mb-8">
        Tell Medora what's going on. Attach a photo, speak it aloud, or type and get calm, clear guidance.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSend(s, [])}
            className="text-left text-sm px-4 py-3 rounded-xl bg-white border border-line hover:border-teal-mid hover:bg-mint-soft transition-colors text-ink"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="w-full max-w-lg mt-8">
        <ChatInput onSend={onSend} disabled={false} />
      </div>
    </div>
  );
}
