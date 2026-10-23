import { useId } from 'react';

export default function ProfileField({ label, value, onChange, error, hint, as = 'input', children, ...rest }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const Tag = as;
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <Tag
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className="field-input"
        {...rest}
      >
        {children}
      </Tag>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-coral-ink">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}
