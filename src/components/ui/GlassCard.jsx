/**
 * @file GlassCard.jsx → Light Card component
 * Backward-compatible: still exported as GlassCard but renders a clean white card.
 */
import React from 'react';

export function GlassCard({ className = '', children, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 shadow-sm rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}

export default GlassCard;
