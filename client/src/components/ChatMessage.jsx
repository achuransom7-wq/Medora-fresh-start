import { useState, useEffect } from 'react';
import { Search, FileText, Check, X, Copy, Phone, Siren } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SeverityBadge from './SeverityBadge';
import BrandMark from './BrandMark';
import client from '../api/client';

// The attachment endpoint requires auth, so a plain <img src> won't carry the
// Bearer token — fetch it as a blob via axios instead and render an object URL.
function AttachmentImage({ id, name }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    client
      .get(`/conversations/attachments/${id}/file`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  if (!src) {
    return <div className="w-20 h-20 rounded-lg border border-white/30 bg-black/10 animate-pulse" />;
  }
  return <img src={src} alt={name} className="w-20 h-20 object-cover rounded-lg border border-white/30" />;
}

function AttachmentThumbs({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <div className="flex gap-2 flex-wrap mb-2">
      {attachments.map((a, idx) =>
        a.kind === 'image' && a.id ? (
          <AttachmentImage key={a.id} id={a.id} name={a.original_name} />
        ) : (
          <div key={a.id || idx} className="flex items-center gap-1.5 text-xs bg-black/10 rounded-lg px-2 py-1.5">
            <FileText size={13} /> {a.original_name}
          </div>
        )
      )}
    </div>
  );
}

export default function ChatMessage({ message, onLearnMore, onFeedback, onEmergency, researchPanel }) {
  const isUser = message.role === 'user';
  const [feedback, setFeedback] = useState({});
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked. Nothing else to do.
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[85%] rounded-3xl rounded-br-lg px-4 py-3 text-white shadow-md md:max-w-[65%]" style={{ background: 'var(--gradient-brand)' }}>
          <AttachmentThumbs attachments={message.attachments} />
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in-up items-start gap-3">
      <BrandMark size={32} className="mt-1 hidden sm:inline-flex" />
      <div className="min-w-0 flex-1">
        <div className="max-w-3xl rounded-3xl rounded-tl-lg border border-line bg-surface px-4 py-3.5 shadow-sm sm:px-5">
          {message.severity && (
            <div className="mb-2.5">
              <SeverityBadge severity={message.severity} />
            </div>
          )}
          <div className="chat-prose text-[15px] text-ink">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <p className="font-bold">{children}</p>,
                h2: ({ children }) => <p className="font-bold">{children}</p>,
                h3: ({ children }) => <p className="font-bold">{children}</p>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-brand pl-3 text-ink-soft">{children}</blockquote>,
                a: ({ children }) => <span className="text-brand-text underline">{children}</span>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {message.severity === 'urgent' && (
            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-danger/40 bg-danger-soft p-3 sm:flex-row sm:items-center">
              <p className="flex flex-1 items-center gap-2 text-sm font-semibold text-danger-ink">
                <Siren size={18} className="shrink-0" /> Get help now. Don't wait for more replies.
              </p>
              <div className="flex gap-2">
                <a href="tel:119" className="btn flex-1 bg-danger text-white hover:opacity-95 sm:flex-none"><Phone size={16} /> Call 119</a>
                {onEmergency && (
                  <button type="button" onClick={onEmergency} className="btn btn-secondary flex-1 sm:flex-none">More options</button>
                )}
              </div>
            </div>
          )}

          {message.differential?.length > 0 && onFeedback && (
            <div className="mt-4 space-y-2 border-t border-line pt-3">
              <p className="text-xs font-medium text-ink-soft">How do these possibilities fit?</p>
              {message.differential.map((candidate) => (
                <div key={candidate.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-semibold text-ink">{candidate.name}</span>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      title="This possibility sounds right"
                      aria-label={`Confirm ${candidate.name}`}
                      disabled={Boolean(feedback[candidate.name])}
                      onClick={async () => {
                        await onFeedback(candidate.name, 'confirmed');
                        setFeedback((current) => ({ ...current, [candidate.name]: 'confirmed' }));
                      }}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-brand/40 px-2.5 text-brand-text hover:bg-brand-soft disabled:opacity-50"
                    >
                      <Check size={12} /> Right
                    </button>
                    <button
                      type="button"
                      title="This possibility does not sound right"
                      aria-label={`Correct ${candidate.name}`}
                      disabled={Boolean(feedback[candidate.name])}
                      onClick={async () => {
                        await onFeedback(candidate.name, 'corrected');
                        setFeedback((current) => ({ ...current, [candidate.name]: 'corrected' }));
                      }}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-danger/40 px-2.5 text-danger-ink hover:bg-danger-soft disabled:opacity-50"
                    >
                      <X size={12} /> Not this
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-1">
          <button type="button" onClick={copy} className="btn-ghost inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
          </button>
          {onLearnMore && (
            <button type="button" onClick={onLearnMore} className="btn-ghost inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors">
              <Search size={13} /> Learn more
            </button>
          )}
        </div>
        {researchPanel}
      </div>
    </div>
  );
}
