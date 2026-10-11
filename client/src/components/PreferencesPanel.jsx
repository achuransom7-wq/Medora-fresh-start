import { useState, useEffect } from 'react';
import { MessageSquare, Check } from 'lucide-react';
import client from '../api/client';

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
  const [prefs, setPrefs] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    client.get('/preferences').then(({ data }) => setPrefs(data.preferences));
  }, []);

  const update = async (patch) => {
    setPrefs((p) => ({ ...p, ...patch }));
    const payload = {};
    if (patch.communication_style !== undefined) payload.communicationStyle = patch.communication_style;
    if (patch.language !== undefined) payload.language = patch.language;
    if (patch.voice_enabled !== undefined) payload.voiceEnabled = !!patch.voice_enabled;
    try {
      await client.put('/preferences', payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // non-fatal
    }
  };

  if (!prefs) return null;

  return (
    <section className="bg-white border border-line rounded-2xl p-5">
      <h2 className="font-semibold text-ink text-sm mb-1 flex items-center gap-2">
        <MessageSquare size={15} className="text-teal-deep" /> How Medora talks to you
        {saved && <Check size={14} className="text-teal-deep" />}
      </h2>
      <p className="text-xs text-ink-soft mb-4">Adjust the tone and language Medora uses in every conversation.</p>

      <div className="mb-4">
        <p className="text-xs font-medium text-ink-soft mb-2">Communication style</p>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => update({ communication_style: s.value })}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                prefs.communication_style === s.value
                  ? 'border-teal-deep bg-mint-soft text-teal-deep font-medium'
                  : 'border-line text-ink hover:bg-cloud'
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
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              onClick={() => update({ language: l.value })}
              className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
                prefs.language === l.value
                  ? 'border-teal-deep bg-mint-soft text-teal-deep font-medium'
                  : 'border-line text-ink hover:bg-cloud'
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
