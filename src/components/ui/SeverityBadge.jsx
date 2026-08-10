/**
 * @file SeverityBadge.jsx — Light theme severity indicator
 */
import React from 'react';

export function SeverityBadge({ level }) {
  const map = {
    Severe:   'text-red-700 bg-red-50 border-red-200',
    Moderate: 'text-orange-700 bg-orange-50 border-orange-200',
    Minor:    'text-amber-700 bg-amber-50 border-amber-200',
  };
  const cls = map[level] ?? 'text-slate-600 bg-slate-100 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {level || 'Unknown'}
    </span>
  );
}
