const SEVERITY_STYLES = {
  self_care: {
    label: 'Self-care',
    bar: 'bg-teal-deep',
    bg: 'bg-mint-soft',
    text: 'text-teal-deep',
    dot: 'bg-teal-deep',
  },
  monitor: {
    label: 'Monitor',
    bar: 'bg-amber',
    bg: 'bg-amber-soft',
    text: 'text-[#8A6416]',
    dot: 'bg-amber',
  },
  see_doctor: {
    label: 'See a doctor soon',
    bar: 'bg-orange-alert',
    bg: 'bg-orange-soft',
    text: 'text-orange-alert',
    dot: 'bg-orange-alert',
  },
  urgent: {
    label: 'Urgent — seek care now',
    bar: 'bg-coral',
    bg: 'bg-coral-soft',
    text: 'text-coral',
    dot: 'bg-coral',
  },
};

export function severityStyle(severity) {
  return SEVERITY_STYLES[severity] || SEVERITY_STYLES.self_care;
}

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
