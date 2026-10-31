export default function AchievementMark({ className = '' }) {
  return (
    <svg
      className={`pc-achievement-mark ${className}`}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path d="m15 29-3 15 12-6 12 6-3-15" fill="var(--pc-accent-strong)" />
      <circle cx="24" cy="21" r="16" fill="var(--pc-accent)" />
      <circle cx="24" cy="21" r="12.5" stroke="var(--pc-accent-ink)" strokeOpacity=".22" />
      <text
        x="24"
        y="21"
        fill="var(--pc-accent-ink)"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="system-ui, sans-serif"
        fontSize="12"
        fontWeight="800"
        letterSpacing="-1"
      >
        Py
      </text>
    </svg>
  );
}
