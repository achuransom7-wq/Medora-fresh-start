import { useState, useEffect } from 'react';
import { Brain, X, Plus } from 'lucide-react';
import client from '../api/client';

const CATEGORY_LABEL = {
  allergy: 'Allergy',
  condition: 'Condition',
  medication: 'Medication',
  pattern: 'Pattern',
  preference: 'Preference',
  other: 'Note',
};

const CATEGORY_COLOR = {
  allergy: 'bg-coral-soft text-coral',
  condition: 'bg-amber-soft text-amber',
  medication: 'bg-mint text-teal-deep',
  pattern: 'bg-orange-soft text-orange-alert',
  preference: 'bg-cloud text-ink-soft',
  other: 'bg-cloud text-ink-soft',
};

export default function MemoryPanel() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('other');

  const load = () => {
    client
      .get('/memories')
      .then(({ data }) => setMemories(data.memories))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const forget = async (id) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    try {
      await client.delete(`/memories/${id}`);
    } catch {
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
    } catch {
      // non-fatal
    }
  };

  return (
    <section className="bg-white border border-line rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-ink text-sm flex items-center gap-2">
          <Brain size={15} className="text-teal-deep" /> What Medora remembers
        </h2>
        <button onClick={() => setAdding((v) => !v)} className="text-teal-mid hover:text-teal-deep p-1" aria-label="Add memory">
          <Plus size={16} />
        </button>
      </div>
      <p className="text-xs text-ink-soft mb-4">
        Medora quietly learns durable facts (allergies, conditions, patterns) from your consultations so it doesn't
        ask you to repeat yourself. Remove anything that's wrong or you'd rather it forget.
      </p>

      {adding && (
        <form onSubmit={addMemory} className="flex flex-col sm:flex-row gap-2 mb-4">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="text-sm border border-line rounded-lg px-2 py-2 bg-cloud"
          >
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. Allergic to penicillin"
            className="flex-1 text-sm border border-line rounded-lg px-3 py-2 outline-none focus:border-teal-mid"
          />
          <button type="submit" className="text-sm font-medium text-white bg-teal-deep rounded-lg px-3 py-2 hover:bg-teal-mid">
            Add
          </button>
        </form>
      )}

      {loading ? (
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
              <button onClick={() => forget(m.id)} aria-label="Forget this" className="text-ink-soft/60 hover:text-coral flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
