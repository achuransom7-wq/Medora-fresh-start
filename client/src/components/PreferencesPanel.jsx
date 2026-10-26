import { useState, useEffect } from 'react';
import { MessageSquare, Check } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/toastContext';
import { getErrorMessage } from '../utils/apiError';

const STYLES = [
  { value: 'simple', label: 'Simple', hint: 'Plain, everyday words' },
  { value: 'standard', label: 'Standard', hint: 'Clear, light medical terms' },
  { value: 'clinical', label: 'Clinical', hint: 'More clinical terminology' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'pidgin', label: 'Pidgin' },
];

export default function PreferencesPanel() {
  const toast = useToast();
  const [prefs, setPrefs] = useState(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    client
      .get('/preferences')
      .then(({ data }) => setPrefs(data.preferences))
      .catch(() => setFailed(true));
  }, []);

  const update = async (patch) => {
    const previous = prefs;
    setPrefs((p) => ({ ...p, ...patch }));
    const payload = {};
    if (patch.communication_style !== undefined) payload.communicationStyle = patch.communication_style;
    if (patch.language !== undefined) payload.language = patch.language;
    try {
      await client.put('/preferences', payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setPrefs(previous); // put the old choice back so the screen never shows something that wasn't saved
      toast.error(getErrorMessage(err, "We couldn't save that preference."));
    }
  };

  if (failed) {
    return (
      <section className="card">
        <p className="text-sm text-ink-soft">We couldn't load your chat preferences. Refresh the page to try again.</p>
      </section>
    );
  }
  if (!prefs) return <section className="card h-40 animate-pulse" aria-hidden="true" />;

  return (
    <section className="card">
      <h2 className="font-semibold text-ink text-sm mb-1 flex items-center gap-2">
        <MessageSquare size={15} className="text-brand-text" /> How Medora talks to you
        {saved && <Check size={14} className="text-brand-text" />}
      </h2>
      <p className="text-xs text-ink-soft mb-4">Adjust the tone and language Medora uses in every conversation.</p>

      <div className="mb-4">
        <p className="text-xs font-medium text-ink-soft mb-2">Communication style</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Communication style">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={prefs.communication_style === s.value}
              onClick={() => update({ communication_style: s.value })}
              className={`text-left min-h-11 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                prefs.communication_style === s.value
                  ? 'border-brand bg-surface-2 text-brand-text font-medium'
                  : 'border-line text-ink hover:bg-canvas'
              }`}
            >
              <div>{s.label}</div>
              <div className="text-[11px] text-ink-soft font-normal mt-0.5">{s.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-ink-soft mb-2">Language</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Language">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              aria-pressed={prefs.language === l.value}
              onClick={() => update({ language: l.value })}
              className={`min-h-11 px-3 py-2 rounded-xl border text-sm transition-colors ${
                prefs.language === l.value
                  ? 'border-brand bg-surface-2 text-brand-text font-medium'
                  : 'border-line text-ink hover:bg-canvas'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
