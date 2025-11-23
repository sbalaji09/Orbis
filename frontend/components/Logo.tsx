export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="180"
      height="180"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main orbital ring */}
      <circle
        cx="100"
        cy="100"
        r="55"
        stroke="#1a1a1a"
        strokeWidth="2"
        fill="none"
      />
      {/* Center dot */}
      <circle cx="100" cy="100" r="6" fill="#1a1a1a" />
      {/* Connecting lines (don't touch any circles) */}
      <line
        x1="110"
        y1="90"
        x2="124"
        y2="76"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="87"
        y1="100"
        x2="67"
        y2="100"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="110"
        y1="110"
        x2="124"
        y2="124"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Top-right orbit point (orange) */}
      <circle
        cx="139"
        cy="61"
        r="14"
        fill="#f59e0b"
        stroke="#1a1a1a"
        strokeWidth="3"
      />
      {/* Left orbit point (blue/purple) */}
      <circle
        cx="45"
        cy="100"
        r="14"
        fill="#5B5FFF"
        stroke="#1a1a1a"
        strokeWidth="3"
      />
      {/* Bottom-right orbit point (green) */}
      <circle
        cx="139"
        cy="139"
        r="14"
        fill="#10b981"
        stroke="#1a1a1a"
        strokeWidth="3"
      />
    </svg>
  );
}
