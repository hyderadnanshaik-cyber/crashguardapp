/**
 * @file WatcherGlassesIcon.jsx
 * @description Professional smart-glasses / watch-glasses SVG icon for
 * Watcher accounts in Crash Guard by RedHack.
 *
 * Usage:
 *   <WatcherGlassesIcon size={24} className="text-sky-600" />
 */
import React from 'react';

export default function WatcherGlassesIcon({ size = 24, className = '', strokeWidth = 1.75, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Watcher glasses icon"
      role="img"
      {...props}
    >
      {/* Left lens frame */}
      <circle cx="6.5" cy="13.5" r="3.5" />
      {/* Right lens frame */}
      <circle cx="17.5" cy="13.5" r="3.5" />
      {/* Bridge between lenses */}
      <line x1="10" y1="13.5" x2="14" y2="13.5" />
      {/* Left temple arm */}
      <path d="M3 13.5 C2 13 1.5 11.5 2 10.5 L3 10" />
      {/* Right temple arm */}
      <path d="M21 13.5 C22 13 22.5 11.5 22 10.5 L21 10" />
      {/* Smart-tech lens highlight dots */}
      <circle cx="6.5" cy="13.5" r="1" fill="currentColor" stroke="none" opacity="0.5" />
      <circle cx="17.5" cy="13.5" r="1" fill="currentColor" stroke="none" opacity="0.5" />
      {/* Top band / frame */}
      <path d="M3 10 Q4 8.5 6.5 8.5 Q9 8.5 10 10" />
      <path d="M21 10 Q20 8.5 17.5 8.5 Q15 8.5 14 10" />
    </svg>
  );
}
