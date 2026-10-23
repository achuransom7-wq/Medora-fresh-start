import { useId, useState } from 'react';
import { X } from 'lucide-react';

/** Type a value and press Enter or comma to add it. Tap the x on a chip to remove it. */
export default function ChipInput({ label, values, onChange, placeholder, hint, max = 30 }) {
  const id = useId();
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const incoming = raw.split(',').map((item) => item.trim()).filter(Boolean);
    if (!incoming.length) return;
    const seen = new Set(values.map((v) => v.toLowerCase()));
    const next = [...values];
    for (const item of incoming) {
      if (item.length > 100 || next.length >= max || seen.has(item.toLowerCase())) continue;
      seen.add(item.toLowerCase());
      next.push(item);
    }
    onChange(next);
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-cloud p-2 transition focus-within:border-teal-mid focus-within:bg-white focus-within:ring-[3px] focus-within:ring-teal-mid/20">
        {values.map((value) => (
          <span key={value} className="inline-flex max-w-full items-center gap-1 rounded-full bg-mint px-3 py-1 text-sm text-teal-deep">
            <span className="truncate">{value}</span>
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              aria-label={`Remove ${value}`}
              className="-mr-1 rounded-full p-1 hover:bg-teal-deep/10"
            >
              <X size={13} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={values.length ? 'Add another' : placeholder}
          enterKeyHint="done"
          className="min-h-9 min-w-32 flex-1 bg-transparent px-1 text-base outline-none"
        />
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">{hint || 'Press Enter or comma after each one.'}</p>
    </div>
  );
}
