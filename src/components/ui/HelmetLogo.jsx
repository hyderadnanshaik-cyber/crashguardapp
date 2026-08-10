import React from 'react';

/**
 * HelmetLogo — renders the real helmet photograph.
 * Drop-in replacement for the previous SVG icon.
 * Uses the helmet.png from /public so it's always served from the CDN root.
 *
 * Props:
 *   className  — Tailwind sizing class (default: 'w-8 h-8')
 *   style      — optional inline style overrides
 */
export function HelmetLogo({ className = 'w-8 h-8', style }) {
  return (
    <img
      src="/helmet.png"
      alt="Crash Guard RedHack Logo"
      className={`object-contain rounded-md drop-shadow-[0_0_6px_rgba(239,68,68,0.35)] ${className}`}
      style={style}
      draggable={false}
    />
  );
}

export default HelmetLogo;
