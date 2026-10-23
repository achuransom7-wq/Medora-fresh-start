import { useState, useEffect } from 'react';
import { Activity, Plus } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/toastContext';
import { getErrorMessage } from '../utils/apiError';

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
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-24"
      role="img"
      aria-label={`Trend of ${series.length} readings from ${min} to ${max}. Latest ${series[series.length - 1].value}.`}
    >
      <polyline points={points.join(' ')} fill="none" stroke="var(--color-teal-mid)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const [x, y] = p.split(',');
        return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--color-teal-deep)" />;
      })}
    </svg>
  );
}

export default function VitalsPanel() {
  const toast = useToast();
  const [type, setType] = useState('weight');
  const [summary, setSummary] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null); // which "type:refresh" the summary on screen belongs to
  const [refresh, setRefresh] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const [logging, setLogging] = useState(false);

  const activeOption = TYPE_OPTIONS.find((o) => o.value === type);
  const key = `${type}:${refresh}`;
  const loading = loadedKey !== key && !loadError;

  useEffect(() => {
    let cancelled = false; // ignore a slow reply if the person already switched to another measurement
    client
      .get('/vitals/summary', { params: { type } })
      .then(({ data }) => {
        if (cancelled) return;
        setSummary(data);
        setLoadError(false);
        setLoadedKey(key);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [type, key]);

  const changeType = (next) => {
    setLoadError(false);
    setType(next);
  };

  const logReading = async (e) => {
    e.preventDefault();
    const v = parseFloat(value);
    if (Number.isNaN(v) || v <= 0) {
      toast.error('Enter a number greater than zero.');
      return;
    }
    if (type === 'symptom_severity' && (v < 1 || v > 10)) {
      toast.error('Symptom severity must be between 1 and 10.');
      return;
    }
    setLogging(true);
    try {
      await client.post('/vitals', { type, value: v, unit: activeOption.unit });
      setValue('');
      setAdding(false);
      setLoadError(false);
      setRefresh((n) => n + 1);
      toast.success('Reading saved.');
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't save that reading."));
    } finally {
      setLogging(false);
    }
  };

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-ink text-sm flex items-center gap-2">
          <Activity size={15} className="text-teal-deep" /> Health trends
        </h2>
        <button type="button" onClick={() => setAdding((v) => !v)} aria-expanded={adding} className="-mr-2 rounded-lg p-2.5 text-teal-mid hover:bg-cloud hover:text-teal-deep" aria-label="Log a reading">
          <Plus size={16} />
        </button>
      </div>
      <p className="text-xs text-ink-soft mb-4">Track vitals over time so Medora, and you, can spot patterns.</p>

      <label htmlFor="vitals-type" className="sr-only">Vital measurement type</label>
      <select id="vitals-type" value={type} onChange={(e) => changeType(e.target.value)} className="field-input mb-3">
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {adding && (
        <form onSubmit={logReading} className="mb-4 flex gap-2">
          <label htmlFor="vitals-value" className="sr-only">Reading value{activeOption.unit ? ` in ${activeOption.unit}` : ''}</label>
          <input
            id="vitals-value"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Value${activeOption.unit ? ` (${activeOption.unit})` : ''}`}
            className="field-input flex-1"
          />
          <button type="submit" disabled={logging} className="btn btn-primary">
            {logging ? 'Saving…' : 'Log'}
          </button>
        </form>
      )}

      {loadError ? (
        <p className="text-sm text-coral-ink" role="alert">
          We couldn't load this chart.{' '}
          <button type="button" onClick={() => { setLoadError(false); setRefresh((n) => n + 1); }} className="underline">Try again</button>
        </p>
      ) : loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : !summary || summary.count === 0 ? (
        <p className="text-sm text-ink-soft py-2">No readings logged yet.</p>
      ) : (
        <>
          <TrendChart series={summary.series} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
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
