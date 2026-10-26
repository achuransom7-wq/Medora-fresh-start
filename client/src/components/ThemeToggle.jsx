import { Sun, Moon, Monitor } from 'lucide-react';
import useTheme from '../hooks/useTheme';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'Auto', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

/** Three-way appearance switch. */
export default function ThemeToggle({ labelled = false }) {
  const { mode, setMode } = useTheme();
  return (
    <div role="group" aria-label="Appearance" className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setMode(value)}
          aria-pressed={mode === value}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${
            mode === value ? 'bg-surface text-brand-text shadow-sm' : 'text-ink-soft hover:text-ink'
          }`}
        >
          <Icon size={15} />
          {labelled && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}
