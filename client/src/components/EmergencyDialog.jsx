import { useEffect } from 'react';
import { Phone, X, Siren, Ambulance, Flame, Hospital } from 'lucide-react';

// Cameroon emergency numbers (medical/SAMU 119, police 117, fire 118), cross-checked against
// Government of Canada travel advice and other public directories. Coverage can vary by area.
const NUMBERS = [
  { number: '119', label: 'Medical emergency / ambulance', Icon: Ambulance, primary: true },
  { number: '117', label: 'Police', Icon: Siren },
  { number: '118', label: 'Fire brigade', Icon: Flame },
];

export default function EmergencyDialog({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="emergency-title" onClick={onClose}>
      <div className="animate-fade-in-up w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-danger-soft text-danger-ink"><Siren size={22} /></span>
            <div>
              <h2 id="emergency-title" className="font-display text-xl font-bold text-ink">Emergency help</h2>
              <p className="text-sm text-ink-soft">Don't wait for a chat reply.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-2"><X size={18} /></button>
        </div>

        <ul className="mt-5 space-y-2.5">
          {NUMBERS.map(({ number, label, Icon, primary }) => (
            <li key={number}>
              <a
                href={`tel:${number}`}
                className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                  primary ? 'border-danger bg-danger text-white hover:opacity-95' : 'border-line bg-surface hover:bg-surface-2'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
                <span className="flex items-center gap-1.5 font-display text-xl font-bold"><Phone size={16} />{number}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed text-ink-soft">
          <p className="mb-2 flex items-center gap-2 font-semibold text-ink"><Hospital size={16} /> While you get help</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Go to the nearest hospital, or ask someone nearby to take you.</li>
            <li>Stay with someone and tell them what is happening.</li>
            <li>Do not drive yourself if you feel faint, confused or very unwell.</li>
          </ul>
        </div>
        <p className="mt-3 text-xs text-ink-soft">Numbers are free to dial on most networks. Availability can vary by area.</p>
      </div>
    </div>
  );
}
