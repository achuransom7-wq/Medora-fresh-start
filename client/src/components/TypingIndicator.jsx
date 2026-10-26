import BrandMark from './BrandMark';

export default function TypingIndicator() {
  return (
    <div className="flex animate-fade-in-up items-center gap-3" role="status" aria-label="Medora is thinking">
      <BrandMark size={32} className="hidden sm:inline-flex" />
      <div className="inline-flex items-center gap-1.5 rounded-3xl rounded-tl-lg border border-line bg-surface px-4 py-3.5 shadow-sm">
        <span className="typing-dot h-2 w-2 rounded-full bg-brand" style={{ animationDelay: '0ms' }} />
        <span className="typing-dot h-2 w-2 rounded-full bg-brand" style={{ animationDelay: '150ms' }} />
        <span className="typing-dot h-2 w-2 rounded-full bg-brand" style={{ animationDelay: '300ms' }} />
        <span className="ml-1.5 text-sm text-ink-soft">Medora is thinking</span>
      </div>
    </div>
  );
}
