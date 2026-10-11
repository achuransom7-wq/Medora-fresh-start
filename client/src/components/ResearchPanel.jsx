import { useState, useEffect } from 'react';
import { X, ExternalLink, Search } from 'lucide-react';
import client from '../api/client';

/**
 * "Learn more" panel — runs a live, cited web lookup grounded in the assistant's
 * last reply, so the patient can see current sources rather than just the model's
 * own words. This is the app's Research Mode / Web Search feature.
 */
export default function ResearchPanel({ seedText, conversationId, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Suggest a reasonable default query from the assistant's message
    const suggestion = seedText.length > 140 ? seedText.slice(0, 140) + '…' : seedText;
    setQuery(`What does current medical guidance say about: ${suggestion}`);
    setReport(null);
    setError(null);
    setStarted(false);
  }, [seedText]);

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
      setError(err.response?.data?.error || 'Could not complete that lookup right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-line rounded-2xl shadow-sm p-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-teal-deep font-medium text-sm">
          <Search size={15} /> Learn more
        </div>
        <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink p-1">
          <X size={16} />
        </button>
      </div>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={2}
        className="w-full text-sm border border-line rounded-xl px-3 py-2 outline-none focus:border-teal-mid resize-none text-ink"
        placeholder="What would you like Medora to look up?"
      />

      <button
        onClick={runResearch}
        disabled={loading || !query.trim()}
        className="mt-2 bg-teal-deep text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-teal-mid transition-colors disabled:opacity-40"
      >
        {loading ? 'Researching…' : 'Search verified sources'}
      </button>

      {error && <p className="text-sm text-coral mt-3">{error}</p>}

      {report && (
        <div className="mt-4 border-t border-line pt-3">
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
                    className="flex items-center gap-1.5 text-xs text-teal-mid hover:text-teal-deep hover:underline break-all"
                  >
                    <ExternalLink size={11} className="flex-shrink-0" /> {s.title}
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
