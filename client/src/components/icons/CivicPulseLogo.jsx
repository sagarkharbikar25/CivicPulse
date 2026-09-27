import React from 'react';

export default function CivicPulseLogo({ className = "w-8 h-8", ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="logoHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#888899" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="logoInnerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Hexagon Border */}
      <polygon
        points="50,4 92,26 92,74 50,96 8,74 8,26"
        fill="url(#logoInnerGlow)"
        stroke="url(#logoHexGrad)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Location Pin */}
      <path
        d="M50 20 C36 20 28 30 28 42 C28 56 46 73 50 78 C54 73 72 56 72 42 C72 30 64 20 50 20 Z"
        fill="#0b0b10"
        stroke="#ffffff"
        strokeWidth="2.5"
      />

      {/* City Skyline Bars */}
      <rect x="39" y="36" width="4" height="15" rx="1" fill="#ffffff" fillOpacity="0.75" />
      <rect x="45" y="30" width="4" height="21" rx="1" fill="#ffffff" fillOpacity="0.95" />
      <rect x="51" y="34" width="4" height="17" rx="1" fill="#ffffff" fillOpacity="0.85" />
      <rect x="57" y="38" width="4" height="13" rx="1" fill="#ffffff" fillOpacity="0.7" />

      {/* Pulse Heartbeat Line */}
      <path
        d="M16 46 L38 46 L44 54 L50 36 L56 54 L62 46 L84 46"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
