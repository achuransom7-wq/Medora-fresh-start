import { severityStyle } from './severityStyle';

export default function SeverityBadge({ severity, size = 'sm' }) {
  const s = severityStyle(severity);
  const Icon = s.Icon;
  const sizeClasses = size === 'sm' ? 'text-xs px-2.5 py-1 gap-1.5' : 'text-sm px-3 py-1.5 gap-2';
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizeClasses} ${s.bg} ${s.text}`}>
      <Icon size={size === 'sm' ? 13 : 15} aria-hidden="true" />
      {s.label}
    </span>
  );
}
