/**
 * @file GlowButton.jsx — Light-theme button system
 * Variants: primary (black), danger (red), secondary (outlined), ghost (text-only)
 */
import React from 'react';

const VARIANTS = {
  primary:   'bg-slate-900 hover:bg-slate-700 text-white shadow-sm',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  secondary: 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-sm',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-600',
  emergency: 'bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse',
};

export function GlowButton({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium px-5 py-2.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm';
  const variantClass = VARIANTS[variant] ?? VARIANTS.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

export default GlowButton;
