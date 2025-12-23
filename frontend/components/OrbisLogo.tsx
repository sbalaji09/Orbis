export function OrbisLogo({ className }: { className?: string }) {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Circular connecting path - smooth round with no edges */}
      <circle
        cx="32"
        cy="32"
        r="20"
        stroke="#000000"
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Nodes */}
      <circle cx="32" cy="12" r="3.5" fill="#3b82f6" stroke="#000000" strokeWidth="0.5" />
      <circle cx="46" cy="18" r="3.5" fill="#f97316" stroke="#000000" strokeWidth="0.5" />
      <circle cx="52" cy="32" r="3.5" fill="#84cc16" stroke="#000000" strokeWidth="0.5" />
      <circle cx="46" cy="46" r="3.5" fill="#ec4899" stroke="#000000" strokeWidth="0.5" />
      <circle cx="32" cy="52" r="3.5" fill="#3b82f6" stroke="#000000" strokeWidth="0.5" />
      <circle cx="18" cy="46" r="3.5" fill="#f97316" stroke="#000000" strokeWidth="0.5" />
      <circle cx="12" cy="32" r="3.5" fill="#84cc16" stroke="#000000" strokeWidth="0.5" />
      <circle cx="18" cy="18" r="3.5" fill="#ec4899" stroke="#000000" strokeWidth="0.5" />
    </svg>
  );
}
