/**
 * @file Navbar.jsx
 * @description GoDaddy-style light navigation bar.
 */
import React, { useState } from 'react';
import { HelmetLogo } from '../ui/HelmetLogo';
import { Menu, X, User, LogOut, Shield } from 'lucide-react';

export function Navbar({ user, onSignOut, onDashboardClick, onAuthClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <HelmetLogo className="w-8 h-8" />
          <a href="/" className="flex flex-col">
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">
              CRASH GUARD
            </span>
            <span className="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase -mt-1">
              by RedHack
            </span>
          </a>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a href="#about-us" className="hover:text-slate-900 transition-colors font-semibold">About Us</a>
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
          <a href="#tech" className="hover:text-slate-900 transition-colors">Technology</a>
          <a href="#team" className="hover:text-slate-900 transition-colors">Team RedHack</a>
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={onDashboardClick}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors"
              >
                <Shield size={18} className="text-red-600" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onAuthClick}
                className="text-sm font-medium text-slate-700 hover:text-slate-900 px-4 py-2 rounded-md transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onAuthClick}
                className="bg-black hover:bg-slate-800 text-white font-medium text-sm px-4 py-2 rounded-md shadow-sm transition-colors"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
          className="md:hidden text-slate-700 hover:text-slate-900 min-w-[48px] min-h-[48px] flex items-center justify-center -mr-2"
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-lg border-b border-slate-200 px-5 pt-3 pb-6 space-y-2 animate-fade-in">
          <a
            href="#about-us"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 text-base font-bold text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            About Us
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 text-base font-semibold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 text-base font-semibold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            How It Works
          </a>
          <a
            href="#tech"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 text-base font-semibold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Technology
          </a>
          <a
            href="#team"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[48px] px-3 text-base font-semibold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Team RedHack
          </a>

          <div className="pt-4 border-t border-slate-200/80 flex flex-col gap-3">
            {user ? (
              <>
                <button
                  onClick={() => { onDashboardClick?.(); setMobileMenuOpen(false); }}
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold min-h-[48px] rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Shield size={18} className="text-red-500" />
                  <span>Go to Dashboard</span>
                </button>
                <button
                  onClick={() => { onSignOut?.(); setMobileMenuOpen(false); }}
                  className="w-full text-slate-600 hover:text-red-600 font-bold min-h-[48px] rounded-xl text-sm flex items-center justify-center transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => { onAuthClick?.(); setMobileMenuOpen(false); }}
                className="w-full bg-black hover:bg-slate-800 text-white font-bold min-h-[48px] rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                Sign In / Get Started
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
