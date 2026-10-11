export default function PulseDivider({ color = '#DCEAE6' }) {
  return (
    <div className="pulse-divider" aria-hidden="true">
      <svg viewBox="0 0 600 12" preserveAspectRatio="none">
        <path
          d="M0,6 L220,6 L235,1 L248,11 L260,3 L272,6 L600,6"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
