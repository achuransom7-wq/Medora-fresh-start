import { CheckCircle2, Eye, Stethoscope, AlertTriangle } from 'lucide-react';

// Each level has a colour, an icon AND a text label, so meaning never depends on colour alone.
const SEVERITY_STYLES = {
  self_care: { label: 'Self-care', bar: 'bg-success', bg: 'bg-success-soft', text: 'text-success-ink', dot: 'bg-success', Icon: CheckCircle2 },
  monitor: { label: 'Monitor', bar: 'bg-caution', bg: 'bg-caution-soft', text: 'text-caution-ink', dot: 'bg-caution', Icon: Eye },
  see_doctor: { label: 'See a doctor soon', bar: 'bg-warn', bg: 'bg-warn-soft', text: 'text-warn-ink', dot: 'bg-warn', Icon: Stethoscope },
  urgent: { label: 'Urgent: seek care now', bar: 'bg-danger', bg: 'bg-danger-soft', text: 'text-danger-ink', dot: 'bg-danger', Icon: AlertTriangle },
};

export function severityStyle(severity) {
  return SEVERITY_STYLES[severity] || SEVERITY_STYLES.self_care;
}
