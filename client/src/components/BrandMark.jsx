/** Medora logo: a soft gradient tile with a heartbeat line forming the letter M. */
export default function BrandMark({ size = 36, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[28%] shadow-sm ${className}`}
      style={{ width: size, height: size, background: 'var(--gradient-brand)' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18V7l4.5 7L12 7l4.5 7L21 7v11" />
      </svg>
    </span>
  );
}
