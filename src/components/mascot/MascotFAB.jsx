/**
 * @file MascotFAB.jsx
 * @description Floating Action Button ("Need Help? Ask RedHack") — GoDaddy Light Theme styling.
 */
import React from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';

export function MascotFAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-105"
    >
      {/* Mini Robot Head Icon */}
      <div className="relative w-6 h-6 flex items-center justify-center">
        <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center shadow-sm animate-pulse">
          <HelpCircle size={14} className="text-white" />
        </div>
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
      </div>

      <span className="text-xs font-extrabold tracking-wide text-slate-800 group-hover:text-slate-950">
        Need Help? Ask RedHack
      </span>

      <Sparkles size={14} className="text-red-600 group-hover:rotate-12 transition-transform" />
    </button>
  );
}

export default MascotFAB;
