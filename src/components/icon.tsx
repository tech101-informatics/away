export default function Icon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width="200"
      height="200"
      className={className}
    >
      <defs />

      <g transform="translate(32, 74) rotate(-40)">
        <path d="M120 60 L0 10 L18 60 Z" fill="currentColor" opacity="0.92" />

        <path d="M120 60 L18 60 L0 110 Z" fill="currentColor" opacity="0.52" />

        <path d="M18 60 L0 10 L0 35 Z" fill="currentColor" opacity="0.25" />

        <line
          x1="120"
          y1="60"
          x2="18"
          y2="60"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />

        <line
          x1="120"
          y1="60"
          x2="0"
          y2="10"
          stroke="currentColor"
          stroke-width="0.8"
          stroke-linecap="round"
          opacity="0.3"
        />

        <line
          x1="-4"
          y1="50"
          x2="-28"
          y2="42"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          opacity="0.55"
        />
        <line
          x1="-2"
          y1="62"
          x2="-26"
          y2="58"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          opacity="0.35"
        />
        <line
          x1="-6"
          y1="40"
          x2="-22"
          y2="34"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
          opacity="0.20"
        />
      </g>
    </svg>
  );
}
