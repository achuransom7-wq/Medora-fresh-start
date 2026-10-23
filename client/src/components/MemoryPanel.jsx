import { useState, useEffect, useCallback } from 'react';
import { Brain, X, Plus } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/toastContext';
import { getErrorMessage } from '../utils/apiError';

const CATEGORY_LABEL = {
  allergy: 'Allergy',
  condition: 'Condition',
  medication: 'Medication',
  pattern: 'Pattern',
  preference: 'Preference',
  other: 'Note',
};

const CATEGORY_COLOR = {
  allergy: 'bg-coral-soft text-coral-ink',
  condition: 'bg-amber-soft text-amber-ink',
  medication: 'bg-mint text-teal-deep',
  pattern: 'bg-orange-soft text-orange-ink',
  preference: 'bg-cloud text-ink-soft',
  other: 'bg-cloud text-ink-soft',
};

export default function MemoryPanel() {
  const toast = useToast();
  const [loadError, setLoadError] = useState(false);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('other');

  const load = useCallback(() => {
    client
      .get('/memories')
      .then(({ data }) => {
        setMemories(data.memories);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const forget = async (id) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    try {
      await client.delete(`/memories/${id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't remove that memory."));
      load(); // resync on failure
    }
  };

  const addMemory = async (e) => {
    e.preventDefault();
    const content = newContent.trim();
    if (!content) return;
    try {
      const { data } = await client.post('/memories', { content, category: newCategory });
      setMemories((prev) => [data.memory, ...prev]);
      setNewContent('');
      setAdding(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't save that memory."));
    }
  };

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-ink text-sm flex items-center gap-2">
          <Brain size={15} className="text-teal-deep" /> What Medora remembers
        </h2>
        <button type="button" onClick={() => setAdding((v) => !v)} aria-expanded={adding} className="-mr-2 rounded-lg p-2.5 text-teal-mid hover:bg-cloud hover:text-teal-deep" aria-label="Add memory">
          <Plus size={16} />
        </button>
      </div>
      <p className="text-xs text-ink-soft mb-4">
        Medora quietly learns durable facts (allergies, conditions, patterns) from your consultations so it doesn't
        ask you to repeat yourself. Remove anything that's wrong or you'd rather it forget.
      </p>

      {adding && (
        <form onSubmit={addMemory} className="flex flex-col sm:flex-row gap-2 mb-4">
          <label htmlFor="memory-category" className="sr-only">Memory category</label>
          <select
            id="memory-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="field-input sm:w-40"
          >
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label htmlFor="memory-content" className="sr-only">Memory details</label>
          <input
            id="memory-content"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. Allergic to penicillin"
            className="field-input flex-1" maxLength={500}
          />
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      )}

      {loadError ? (
        <p className="text-sm text-coral-ink" role="alert">
          We couldn't load your memories.{' '}
          <button type="button" onClick={load} className="underline">Try again</button>
        </p>
      ) : loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : memories.length === 0 ? (
        <p className="text-sm text-ink-soft">Nothing yet — this fills in as you talk with Medora.</p>
      ) : (
        <div className="space-y-2">
          {memories.map((m) => (
            <div key={m.id} className="flex items-start gap-2 bg-cloud rounded-xl px-3 py-2.5">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLOR[m.category]}`}>
                {CATEGORY_LABEL[m.category]}
              </span>
              <p className="flex-1 text-sm text-ink">{m.content}</p>
              <button type="button" onClick={() => forget(m.id)} aria-label={`Forget: ${m.content}`} className="-m-1.5 shrink-0 rounded-lg p-2 text-ink-soft hover:text-coral-ink">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
