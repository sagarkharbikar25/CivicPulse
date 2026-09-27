import React from 'react';

export default function RoadIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 22 8 2" />
      <path d="M20 22 16 2" />
      <line x1="12" x2="12" y1="5" y2="8" />
      <line x1="12" x2="12" y1="12" y2="15" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
