import React from 'react';

export function LogoMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))' }} />
        </linearGradient>
      </defs>
      <path
        d="M15 12C15 12 12 8.5 12 6C12 3.5 15 2 15 2L22 8L15 12Z"
        fill="url(#logo-gradient)"
      />
      <path
        d="M9 12C9 12 12 15.5 12 18C12 20.5 9 22 9 22L2 16L9 12Z"
        fill="url(#logo-gradient)"
        opacity="0.8"
      />
    </svg>
  );
}
