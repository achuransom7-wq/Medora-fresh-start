import { useState, useEffect } from 'react';
import { Search, FileText, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SeverityBadge from './SeverityBadge';
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

export default function ChatMessage({ message, onLearnMore, onFeedback, researchPanel }) {
  const isUser = message.role === 'user';
  const [feedback, setFeedback] = useState({});

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[80%] md:max-w-[65%] bg-teal-deep text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
          <AttachmentThumbs attachments={message.attachments} />
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="w-full flex">
        <div className="flex-1 min-w-0">
          {message.severity && (
            <div className="mb-1.5">
              <SeverityBadge severity={message.severity} />
            </div>
          )}
          <div className="px-0.5 py-1 text-[15px] leading-relaxed text-ink">
            <div>
              <ReactMarkdown
                components={{
                  h2: ({ children }) => <h2 className="font-display text-base font-semibold text-ink mb-2">{children}</h2>,
                  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>,
                  li: ({ children }) => <li>{children}</li>,
                  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-teal-mid pl-3 text-ink-soft">{children}</blockquote>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            {message.differential?.length > 0 && onFeedback && (
              <div className="mt-3 border-t border-line pt-3 space-y-2">
                <p className="text-xs text-ink-soft">How do these possibilities fit?</p>
                {message.differential.map((candidate) => (
                  <div key={candidate.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-ink truncate">{candidate.name}</span>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        title="This possibility sounds right"
                        aria-label={`Confirm ${candidate.name}`}
                        disabled={Boolean(feedback[candidate.name])}
                        onClick={async () => {
                          await onFeedback(candidate.name, 'confirmed');
                          setFeedback((current) => ({ ...current, [candidate.name]: 'confirmed' }));
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-teal-mid/40 px-2 py-1 text-teal-deep hover:bg-teal-pale disabled:opacity-50"
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
                        className="inline-flex items-center gap-1 rounded-md border border-coral/40 px-2 py-1 text-coral hover:bg-coral/10 disabled:opacity-50"
                      >
                        <X size={12} /> Not this
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {onLearnMore && (
            <button
              onClick={onLearnMore}
              className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-teal-mid hover:text-teal-deep transition-colors"
            >
              <Search size={12} /> Learn more, with sources
            </button>
          )}
          {researchPanel}
        </div>
      </div>
    </div>
  );
}
