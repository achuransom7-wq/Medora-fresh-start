import { severityStyle } from './severityStyle';

export default function SeverityBadge({ severity, size = 'sm' }) {
  const s = severityStyle(severity);
  const sizeClasses = size === 'sm' ? 'text-xs px-2.5 py-1 gap-1.5' : 'text-sm px-3 py-1.5 gap-2';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${severity === 'urgent' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  );
}
