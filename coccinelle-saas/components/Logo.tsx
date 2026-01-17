import { memo } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Tête arrondie style Pac-Man ghost - pixelisée */}
      <rect x="3" y="2" width="10" height="1" fill="#EF4444" />
      <rect x="2" y="3" width="12" height="1" fill="#EF4444" />
      <rect x="1" y="4" width="14" height="7" fill="#EF4444" />

      {/* Ondulations du bas (tentacules) - style mignon */}
      <rect x="2" y="11" width="2" height="1" fill="#EF4444" />
      <rect x="7" y="11" width="2" height="1" fill="#EF4444" />
      <rect x="12" y="11" width="2" height="1" fill="#EF4444" />

      <rect x="2" y="12" width="2" height="2" fill="#EF4444" />
      <rect x="7" y="12" width="2" height="2" fill="#EF4444" />
      <rect x="12" y="12" width="2" height="2" fill="#EF4444" />

      {/* Yeux blancs rigolos - ronds et grands */}
      <circle cx="5" cy="6" r="2" fill="white" />
      <circle cx="11" cy="6" r="2" fill="white" />

      {/* Pupilles noires - grandes et expressives */}
      <circle cx="5" cy="6" r="1" fill="#1A202C" />
      <circle cx="11" cy="6" r="1" fill="#1A202C" />

      {/* Reflets blancs dans les yeux pour plus d'expression */}
      <circle cx="5.5" cy="5.5" r="0.5" fill="white" />
      <circle cx="11.5" cy="5.5" r="0.5" fill="white" />
    </svg>
  );
}

export default memo(Logo);
