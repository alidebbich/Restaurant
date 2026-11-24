// Tunisian 8-point star (khatam/zellige) SVG pattern
// Uses currentColor — wrap in a colored context to tint it
// Keep at 3–8% opacity over dark brand sections

export function ZelligePattern({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id="zellige"
          x="0"
          y="0"
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          {/* 8-point star tile */}
          <g fill="none" stroke="currentColor" strokeWidth="1">
            {/* Outer square */}
            <rect x="10" y="10" width="60" height="60" />
            {/* Diagonal lines forming the star */}
            <line x1="10" y1="10" x2="40" y2="25" />
            <line x1="70" y1="10" x2="55" y2="25" />
            <line x1="70" y1="70" x2="55" y2="55" />
            <line x1="10" y1="70" x2="25" y2="55" />
            {/* Inner octagon */}
            <polygon points="40,15 55,25 65,40 55,55 40,65 25,55 15,40 25,25" />
            {/* Center cross */}
            <line x1="40" y1="15" x2="40" y2="65" />
            <line x1="15" y1="40" x2="65" y2="40" />
            {/* Diagonal cross */}
            <line x1="25" y1="25" x2="55" y2="55" />
            <line x1="55" y1="25" x2="25" y2="55" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#zellige)" />
    </svg>
  );
}

