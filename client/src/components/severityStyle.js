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
    text: 'text-amber-ink',
    dot: 'bg-amber',
  },
  see_doctor: {
    label: 'See a doctor soon',
    bar: 'bg-orange-alert',
    bg: 'bg-orange-soft',
    text: 'text-orange-ink',
    dot: 'bg-orange-alert',
  },
  urgent: {
    label: 'Urgent — seek care now',
    bar: 'bg-coral',
    bg: 'bg-coral-soft',
    text: 'text-coral-ink',
    dot: 'bg-coral',
  },
};

export function severityStyle(severity) {
  return SEVERITY_STYLES[severity] || SEVERITY_STYLES.self_care;
}
