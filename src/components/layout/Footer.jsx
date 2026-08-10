/**
 * @file Footer.jsx
 * @description Persistent Brand Footer across all views.
 * Requirements:
 * "Created by RedHack" ("Created by" in soft gray text-slate-500; "RedHack" in bold glowing red text-red-600 font-bold).
 */
import React from 'react';
import { HelmetLogo } from '../ui/HelmetLogo';

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-8 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-2">
          <HelmetLogo className="w-6 h-6" />
          <span className="font-bold text-slate-900 text-sm tracking-tight">
            Crash Guard <span className="text-red-600 font-bold text-xs">by RedHack</span>
          </span>
        </div>

        {/* Copyright & Mandatory Signature */}
        <div className="text-xs text-center sm:text-right">
          <span className="text-slate-500">Created by </span>
          <span className="text-red-600 font-bold tracking-wide drop-shadow-[0_0_8px_rgba(238,0,0,0.3)]">
            RedHack
          </span>
          <span className="text-slate-400 ml-2">© {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
