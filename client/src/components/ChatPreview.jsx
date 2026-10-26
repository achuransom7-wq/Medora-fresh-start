import { ShieldCheck } from 'lucide-react';
import BrandMark from './BrandMark';
import SeverityBadge from './SeverityBadge';

/** A static sample conversation used on the landing and sign-in screens. */
export default function ChatPreview({ className = '' }) {
  return (
    <figure className={`rounded-[1.75rem] border border-line bg-surface p-4 shadow-[var(--shadow-pop)] sm:p-5 ${className}`} aria-label="Sample conversation with Medora">
      <figcaption className="mb-4 flex items-center gap-3 border-b border-line pb-3">
        <BrandMark size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Medora</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Here whenever you need</p>
        </div>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-text">Sample chat</span>
      </figcaption>

      <div className="space-y-3 text-left">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm text-white" style={{ background: 'var(--gradient-brand)' }}>
            I've had a fever and a headache since yesterday.
          </p>
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-line bg-surface-2 px-3.5 py-3 text-sm leading-relaxed text-ink">
          <div className="mb-2"><SeverityBadge severity="see_doctor" /></div>
          <p>I'm sorry you're feeling unwell. This combination can have several causes, including <strong>malaria</strong>, which is common here.</p>
          <p className="mt-2">A quick malaria test today is a good idea. Rest, drink plenty of fluids, and get care sooner if you notice confusion, a stiff neck or trouble breathing.</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {['Where can I get tested?', 'What can I take for the fever?'].map((chip) => (
            <span key={chip} className="rounded-full border border-brand/30 bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-text">{chip}</span>
          ))}
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-soft"><ShieldCheck size={13} /> General guidance only. Not a diagnosis.</p>
    </figure>
  );
}
