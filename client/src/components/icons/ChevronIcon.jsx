import React from 'react';

export default function ChevronIcon({ className = "w-5 h-5", direction = "down", ...props }) {
  const rotationMap = {
    up: "rotate-180",
    down: "rotate-0",
    left: "rotate-90",
    right: "-rotate-90",
  };

  return (
    <svg
      className={`${className} transition-transform duration-200 ${rotationMap[direction] || ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
