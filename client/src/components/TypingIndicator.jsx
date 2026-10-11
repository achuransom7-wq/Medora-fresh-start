export default function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="bg-white border border-line rounded-2xl rounded-tl-md px-4 py-3.5 shadow-sm inline-flex gap-1.5 items-center">
        <span className="w-2 h-2 rounded-full bg-teal-mid typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-teal-mid typing-dot" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-teal-mid typing-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
