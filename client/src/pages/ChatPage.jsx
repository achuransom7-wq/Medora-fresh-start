import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu, ShieldAlert, FileDown, Volume2, VolumeX, Siren, Stethoscope, BookOpen, ClipboardList, Leaf } from 'lucide-react';
import client from '../api/client';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import ReferralCard from '../components/ReferralCard';
import ResearchPanel from '../components/ResearchPanel';
import EmergencyDialog from '../components/EmergencyDialog';
import BrandMark from '../components/BrandMark';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/toastContext';
import usePageMeta from '../hooks/usePageMeta';
import { getErrorMessage } from '../utils/apiError';

async function downloadSummaryPdf(summary, fileName) {
  // jsPDF is large, so it is only downloaded when someone actually exports a summary.
  const { jsPDF } = await import('jspdf');
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
  usePageMeta({ title: 'Chat', noindex: true });
  const toast = useToast();
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
  const [suggestions, setSuggestions] = useState([]);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const justCreatedRef = useRef(null);
  const { user } = useAuth();
  const [researchTarget, setResearchTarget] = useState(null);
  const scrollRef = useRef(null);
  const messageRefs = useRef({});

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await client.get('/conversations');
      setConversations(data.conversations);
    } catch {
      // The sidebar list simply stays as it was; the chat itself still works.
    }
  }, []);

  useEffect(() => {
    loadConversations();
    client.get('/preferences').then(({ data }) => setPreferences(data.preferences)).catch(() => {});
  }, [loadConversations]);

  useEffect(() => {
    setReferralSuggestion(null);
    setSuggestions([]);
    setResearchTarget(null);
    // A conversation this page just created is already on screen, so there is nothing to load.
    // Loading it would race with the reply that is still on its way and could wipe it out.
    if (id && id === justCreatedRef.current) {
      justCreatedRef.current = null;
      return;
    }
    if (!id) {
      setMessages([]);
      return;
    }
    setLoadingConversation(true);
    client
      .get(`/conversations/${id}`)
      .then(({ data }) => setMessages(data.messages))
      .catch((err) => {
        toast.error(getErrorMessage(err, "We couldn't open that conversation."));
        navigate('/');
      })
      .finally(() => setLoadingConversation(false));
  }, [id, navigate, toast]);

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
    try {
      const { data } = await client.post('/conversations');
      setConversations((prev) => [data.conversation, ...prev]);
      navigate(`/chat/${data.conversation.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't start a new chat."));
    }
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
      try {
        const { data } = await client.post('/conversations');
        conversationId = data.conversation.id;
        justCreatedRef.current = conversationId;
        setConversations((prev) => [data.conversation, ...prev]);
        navigate(`/chat/${conversationId}`, { replace: true });
      } catch (err) {
        toast.error(getErrorMessage(err, "We couldn't start the conversation."));
        return;
      }
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
    setSuggestions([]);
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
      setSuggestions(data.suggestions || []);
      speakLatestReply(data.assistantMessage.content);
      loadConversations();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: getErrorMessage(err),
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
      toast.error(getErrorMessage(err, "We couldn't save that referral request."));
    } finally {
      setBookingId(null);
    }
  };

  const handleAgentFeedback = async (diseaseName, outcome) => {
    if (!id) return;
    try {
      await client.post('/local-agent/feedback', { conversationId: id, diseaseName, outcome });
      toast.success('Thanks, your feedback was saved.');
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't save your feedback."));
    }
  };

  const handleExportSummary = async () => {
    if (!id) return;
    setSummaryLoading(true);
    try {
      const { data } = await client.get(`/conversations/${id}/summary`);
      await downloadSummaryPdf(data.summary, `medora-consultation-summary-${id.slice(0, 8)}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't create the summary."));
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDownloadThreadSummary = async (project) => {
    try {
      const { data } = await client.get(`/projects/${project.id}/summary`);
      const safeTitle = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      await downloadSummaryPdf(data.summary, `medora-consultation-thread-${safeTitle || project.id.slice(0, 8)}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't create the thread summary."));
    }
  };

  const isUrgent = messages[messages.length - 1]?.severity === 'urgent';
  const hasVoiceSupport = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const userPrompts = messages.filter((message) => message.role === 'user');

  const jumpToPrompt = (messageId) => {
    messageRefs.current[messageId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex h-dvh bg-canvas">
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
        <header className="glass sticky top-0 z-10 flex items-center gap-2 border-b border-line px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:gap-3 sm:px-5">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="btn-ghost -ml-1 rounded-xl p-2.5 md:hidden">
            <Menu size={22} />
          </button>
          <span className="flex items-center gap-2 font-display font-bold text-ink md:hidden"><BrandMark size={28} /><span className="hidden min-[440px]:inline">Medora</span></span>
          <div className="flex-1" />
          {hasVoiceSupport && (
            <button
              type="button"
              onClick={toggleAutoSpeak}
              aria-label={preferences?.auto_speak_replies ? 'Turn off spoken replies' : 'Turn on spoken replies'}
              title={preferences?.auto_speak_replies ? 'Spoken replies: on' : 'Spoken replies: off'}
              className={`rounded-xl p-2.5 transition-colors ${
                preferences?.auto_speak_replies ? 'bg-brand-soft text-brand-text' : 'btn-ghost'
              }`}
            >
              {preferences?.auto_speak_replies ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          {id && messages.length > 0 && (
            <button
              type="button"
              onClick={handleExportSummary}
              disabled={summaryLoading}
              className="btn-ghost flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              aria-label="Download consultation summary"
            >
              <FileDown size={17} />
              <span className="hidden sm:inline">{summaryLoading ? 'Preparing…' : 'Summary'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setEmergencyOpen(true)}
            className="flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-danger-soft px-3 text-sm font-semibold text-danger-ink transition-opacity hover:opacity-90"
          >
            <Siren size={16} /> <span>Emergency</span>
          </button>
        </header>

        {isUrgent && (
          <div role="alert" className="flex items-center gap-2 bg-danger px-4 py-2.5 text-sm font-semibold text-white">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <span>This may be urgent. If you're in danger, go to the nearest hospital or call emergency services now.</span>
          </div>
        )}

        {/* Message area */}
        <div id="main" role="main" ref={scrollRef} className="relative flex-1 overflow-y-auto">
          {!id && messages.length === 0 ? (
            <EmptyState onSend={handleSend} firstName={user?.fullName?.split(' ')[0]} />
          ) : (
            <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-8 md:px-12 md:py-8">
              {loadingConversation ? (
                <p className="text-center text-ink-soft text-sm py-10">Loading…</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} ref={(element) => { messageRefs.current[m.id] = element; }}>
                    <ChatMessage
                      message={m}
                      onLearnMore={m.role === 'assistant' ? () => setResearchTarget({ messageId: m.id, text: m.content }) : null}
                      onFeedback={m.role === 'assistant' ? handleAgentFeedback : null}
                      onEmergency={() => setEmergencyOpen(true)}
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
                  <span className="h-0.5 w-6 rounded-full bg-ink-soft/35 transition-all group-hover:w-7 group-hover:bg-brand" />
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Input area */}
        {(id || messages.length > 0) && (
          <div className="glass border-t border-line px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
            <div className="mx-auto max-w-3xl">
              {suggestions.length > 0 && !sending && (
                <div className="-mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Suggested replies">
                  {suggestions.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => handleSend(text, [])}
                      className="animate-fade-in-up shrink-0 rounded-full border border-brand/30 bg-brand-soft px-3.5 py-2 text-sm font-medium text-brand-text transition-colors hover:border-brand"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}
              <ChatInput onSend={handleSend} disabled={sending} />
              <p className="mt-2 text-center text-xs text-ink-soft">
                Medora gives general guidance, not a diagnosis. In an emergency, get in-person care immediately.
              </p>
            </div>
          </div>
        )}
      </div>
      <EmergencyDialog open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const STARTERS = [
  { Icon: Stethoscope, title: 'Check my symptoms', text: "I've had a headache and a mild fever since yesterday" },
  { Icon: BookOpen, title: 'Understand a condition', text: 'Explain malaria to me in simple words' },
  { Icon: ClipboardList, title: 'Prepare for a doctor visit', text: 'Help me prepare for my doctor appointment' },
  { Icon: Leaf, title: 'Healthy habits', text: 'Give me simple tips for better sleep' },
];

function EmptyState({ onSend, firstName }) {
  return (
    <div className="relative flex h-full min-h-full flex-col items-center justify-center overflow-hidden px-4 py-8 text-center">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-80 opacity-70" style={{ background: 'radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--c-brand) 22%, transparent), transparent)' }} aria-hidden="true" />
      <div className="relative w-full max-w-2xl">
        <BrandMark size={56} className="animate-float mx-auto mb-5" />
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
          {greeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mx-auto mb-8 mt-2 max-w-md text-base text-ink-soft">
          How are you feeling today? Tell me what's going on, or just say hello.
        </p>
        <div className="grid grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
          {STARTERS.map(({ Icon, title, text }) => (
            <button
              key={title}
              type="button"
              onClick={() => onSend(text, [])}
              className="group flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text"><Icon size={19} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{text}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-6 w-full">
          <ChatInput onSend={onSend} disabled={false} />
          <p className="mt-2 text-xs text-ink-soft">Medora gives general guidance, not a diagnosis.</p>
        </div>
      </div>
    </div>
  );
}
