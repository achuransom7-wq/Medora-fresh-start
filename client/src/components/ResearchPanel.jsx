import { useState } from 'react';
import { X, ExternalLink, Search } from 'lucide-react';
import client from '../api/client';
import { getErrorMessage } from '../utils/apiError';

/**
 * "Learn more" panel — runs a live, cited web lookup grounded in the assistant's
 * last reply, so the patient can see current sources rather than just the model's
 * own words. This is the app's Research Mode / Web Search feature.
 */
export default function ResearchPanel({ seedText, conversationId, onClose }) {
  const [query, setQuery] = useState(() => `What does current medical guidance say about: ${seedText.length > 140 ? seedText.slice(0, 140) + '…' : seedText}`);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);

  // Start fresh whenever the message being researched changes (React-recommended "reset state on prop change").
  const [seen, setSeen] = useState(seedText);
  if (seen !== seedText) {
    const suggestion = seedText.length > 140 ? seedText.slice(0, 140) + '…' : seedText;
    setSeen(seedText);
    setQuery(`What does current medical guidance say about: ${suggestion}`);
    setReport(null);
    setError(null);
    setStarted(false);
  }

  const runResearch = async () => {
    setLoading(true);
    setError(null);
    setStarted(true);
    try {
      const { data } = await client.post('/research', {
        query,
        conversationId: conversationId || undefined,
        context: seedText.slice(0, 900),
      });
      setReport(data.report);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not complete that lookup right now.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-sm p-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-brand-text font-medium text-sm">
          <Search size={15} /> Learn more
        </div>
        <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink p-1">
          <X size={16} />
        </button>
      </div>

      <label htmlFor="research-query" className="sr-only">Health research question</label>
      <textarea
        id="research-query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={2}
        className="w-full text-sm border border-line rounded-xl px-3 py-2 outline-none focus:border-brand resize-none text-ink"
        placeholder="What would you like Medora to look up?"
      />

      <button
        onClick={runResearch}
        disabled={loading || !query.trim()}
        className="mt-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-hover transition-colors disabled:opacity-40"
      >
        {loading ? 'Researching…' : 'Research this question'}
      </button>

      {error && <p role="alert" className="text-sm text-danger-ink mt-3">{error}</p>}

      {report && (
        <div aria-live="polite" className="mt-4 border-t border-line pt-3">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{report.content}</p>
          {report.sources?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-ink-soft uppercase tracking-wide mb-1.5">Sources</p>
              <div className="space-y-1">
                {report.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-brand-text hover:text-brand-text hover:underline break-all"
                  >
                    <ExternalLink size={11} aria-hidden="true" className="flex-shrink-0" /> {s.title}<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {started && !loading && !report && !error && (
        <p className="text-sm text-ink-soft mt-3">No results yet.</p>
      )}
    </div>
  );
}
