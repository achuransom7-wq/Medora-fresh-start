import { useState, useEffect, useCallback } from 'react';
import { Activity, Plus } from 'lucide-react';
import client from '../api/client';

const TYPE_OPTIONS = [
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'temperature', label: 'Temperature', unit: '°C' },
  { value: 'blood_pressure_systolic', label: 'Blood pressure (systolic)', unit: 'mmHg' },
  { value: 'blood_pressure_diastolic', label: 'Blood pressure (diastolic)', unit: 'mmHg' },
  { value: 'heart_rate', label: 'Heart rate', unit: 'bpm' },
  { value: 'blood_glucose', label: 'Blood glucose', unit: 'mg/dL' },
  { value: 'symptom_severity', label: 'Symptom severity (1-10)', unit: '' },
];

function TrendChart({ series }) {
  if (series.length < 2) {
    return <p className="text-sm text-ink-soft py-6 text-center">Log at least two readings to see a trend.</p>;
  }
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 320;
  const height = 90;
  const padding = 8;

  const points = series.map((s, i) => {
    const x = padding + (i / (series.length - 1)) * (width - padding * 2);
    const y = height - padding - ((s.value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
      <polyline points={points.join(' ')} fill="none" stroke="var(--color-teal-mid)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const [x, y] = p.split(',');
        return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--color-teal-deep)" />;
      })}
    </svg>
  );
}

export default function VitalsPanel() {
  const [type, setType] = useState('weight');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');

  const activeOption = TYPE_OPTIONS.find((o) => o.value === type);

  const loadSummary = useCallback(() => {
    setLoading(true);
    client
      .get('/vitals/summary', { params: { type } })
      .then(({ data }) => setSummary(data))
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(loadSummary, [loadSummary]);

  const logReading = async (e) => {
    e.preventDefault();
    const v = parseFloat(value);
    if (Number.isNaN(v)) return;
    try {
      await client.post('/vitals', { type, value: v, unit: activeOption.unit });
      setValue('');
      setAdding(false);
      loadSummary();
    } catch {
      // non-fatal
    }
  };

  return (
    <section className="bg-white border border-line rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-ink text-sm flex items-center gap-2">
          <Activity size={15} className="text-teal-deep" /> Health trends
        </h2>
        <button onClick={() => setAdding((v) => !v)} className="text-teal-mid hover:text-teal-deep p-1" aria-label="Log a reading">
          <Plus size={16} />
        </button>
      </div>
      <p className="text-xs text-ink-soft mb-4">Track vitals over time so Medora — and you — can spot patterns.</p>

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full text-sm border border-line rounded-lg px-3 py-2 bg-cloud mb-3"
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {adding && (
        <form onSubmit={logReading} className="flex gap-2 mb-4">
          <input
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Value${activeOption.unit ? ` (${activeOption.unit})` : ''}`}
            className="flex-1 text-sm border border-line rounded-lg px-3 py-2 outline-none focus:border-teal-mid"
          />
          <button type="submit" className="text-sm font-medium text-white bg-teal-deep rounded-lg px-3 py-2 hover:bg-teal-mid">
            Log
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : !summary || summary.count === 0 ? (
        <p className="text-sm text-ink-soft py-2">No readings logged yet.</p>
      ) : (
        <>
          <TrendChart series={summary.series} />
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            <Stat label="Latest" value={summary.latest} />
            <Stat label="Average" value={summary.avg} />
            <Stat label="Min" value={summary.min} />
            <Stat label="Max" value={summary.max} />
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-cloud rounded-lg py-2">
      <p className="text-sm font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-ink-soft uppercase tracking-wide">{label}</p>
    </div>
  );
}
