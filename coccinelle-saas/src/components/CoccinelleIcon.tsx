export const CoccinelleIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5, className = "" }: { size?: number; color?: string; strokeWidth?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M11.5 6 C5.5 6 2 9.5 2 13.5 C2 17.5 5.5 21 11.5 21 Z"/>
    <path d="M12.5 6 C18.5 6 22 9.5 22 13.5 C22 17.5 18.5 21 12.5 21 Z"/>
    <line x1="12" y1="6" x2="12" y2="21"/>
  </svg>
);

export default CoccinelleIcon;
