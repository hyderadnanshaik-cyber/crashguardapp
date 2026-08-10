/**
 * @file AuthModal.jsx
 * @description GoDaddy-style light-theme auth with STRICT registration enforcement.
 * Auto-switches to Register tab when "account not found" is detected.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Eye, EyeOff, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { HelmetLogo } from '../ui/HelmetLogo';
import { useAuth } from '../../hooks/useAuth';

export default function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'signin', isForced = false }) {
  const [tab,           setTab]           = useState(defaultTab); // 'signin' | 'register'
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [fullName,      setFullName]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [keepSignedIn,  setKeepSignedIn]  = useState(true);
  const [error,         setError]         = useState('');
  const [errorType,     setErrorType]     = useState(''); // 'not-found' | 'general' | 'timeout'
  const [loading,       setLoading]       = useState(false);
  const [slowConn,      setSlowConn]      = useState(false); // shown after 8s
  const slowTimerRef = useRef(null);
  const abortRef     = useRef(false);     // lets us cancel an in-flight form submit

  const { signIn, register, signInWithGoogle } = useAuth();

  // Sync tab if defaultTab changes
  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  // Start / cancel the slow-connection warning timer
  const startSlowTimer = useCallback(() => {
    setSlowConn(false);
    slowTimerRef.current = setTimeout(() => setSlowConn(true), 8000);
  }, []);

  const cancelSlowTimer = useCallback(() => {
    clearTimeout(slowTimerRef.current);
    setSlowConn(false);
  }, []);

  if (!isOpen) return null;

  const clearError = () => { setError(''); setErrorType(''); };

  const switchToRegister = () => {
    setTab('register');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    abortRef.current = false;
    setLoading(true);
    startSlowTimer();

    try {
      if (tab === 'register') {
        await register(email, password, fullName);
      } else {
        await signIn(email, password);
      }
      if (!abortRef.current) {
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      if (abortRef.current) return; // user cancelled — swallow error
      // timeout error from useAuth
      if (err.message && err.message.includes('timed out')) {
        setErrorType('timeout');
        setError(err.message);
      } else if (err.shouldSwitchToRegister) {
        setErrorType('not-found');
        setError(err.message);
      } else {
        setErrorType('general');
        setError(err.message);
      }
    } finally {
      if (!abortRef.current) setLoading(false);
      cancelSlowTimer();
    }
  };

  const handleCancel = () => {
    abortRef.current = true;
    setLoading(false);
    cancelSlowTimer();
    clearError();
  };

  const handleSocial = async (providerFn) => {
    clearError();
    abortRef.current = false;
    setLoading(true);
    try {
      const u = await providerFn();
      if (!abortRef.current && u) {
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error('[AuthModal] Social auth failed:', err);
      if (abortRef.current) return;
      setErrorType('general');
      const msg = err?.message || String(err);
      if (msg.includes('unauthorized-domain') || err?.code === 'auth/unauthorized-domain') {
        setError(
          `Firebase Security Notice: To use Google Sign-In on mobile IP (${window.location.hostname}), add '${window.location.hostname}' under Firebase Console > Authentication > Settings > Authorized Domains. Or use Email/Password sign in below.`
        );
      } else {
        setError(msg || 'Google sign-in failed. Please try again.');
      }
    } finally {
      if (!abortRef.current) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white shadow-2xl rounded-2xl border border-slate-100 overflow-hidden">

        {/* First-time forced banner */}
        {isForced && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <p className="text-white text-xs font-semibold tracking-wide">
              Welcome to Crash Guard — create a free account or sign in to continue.
            </p>
          </div>
        )}

        {/* Close button — always available so users on mobile or shared links can close the login card */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center gap-2 mb-3">
              <HelmetLogo className="w-9 h-9" />
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-600">
                CRASH GUARD by RedHack
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {tab === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {tab === 'signin'
                ? <>No account yet?{' '}<button type="button" onClick={switchToRegister} className="text-red-600 font-semibold hover:underline">Create one free</button></>
                : <>Already a rider?{' '}<button type="button" onClick={() => { setTab('signin'); clearError(); }} className="text-slate-800 font-semibold hover:underline">Sign in</button></>
              }
            </p>
          </div>

          {/* Terms */}
          <div className="mb-5 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed">
            By continuing, you agree to Crash Guard's Safety Monitoring Terms, Vehicle Data Collection Consent, and Privacy Policy.
          </div>

          {/* Error Callout — Account Not Found */}
          {error && errorType === 'not-found' && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Account Not Found</p>
                  <p className="text-xs text-amber-700 mt-0.5">{error}</p>
                  <button
                    type="button"
                    onClick={switchToRegister}
                    className="mt-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1"
                  >
                    Create Account Now →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Callout — Timeout */}
          {error && errorType === 'timeout' && (
            <div className="mb-5 p-4 bg-orange-50 border border-orange-300 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-orange-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-800">Connection Timed Out</p>
                  <p className="text-xs text-orange-700 mt-0.5">The request took too long. Please check your internet connection.</p>
                  <button
                    type="button"
                    onClick={() => { clearError(); }}
                    className="mt-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw size={11} /> Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Callout — General */}
          {error && errorType === 'general' && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700 font-medium">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Slow connection warning */}
          {slowConn && loading && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-700 font-medium animate-fade-in">
              <Loader2 size={14} className="animate-spin shrink-0" />
              <span>Connecting to Firebase… this is taking a moment.</span>
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex rounded-lg border border-slate-200 mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => { setTab('signin'); clearError(); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'signin' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); clearError(); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'register' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text" required value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {tab === 'signin' ? 'Username / Email / Customer #' : 'Email Address'}
              </label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@email.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {tab === 'signin' && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input type="checkbox" checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="w-4 h-4 rounded accent-black border-slate-300" />
                  Keep me signed in
                </label>
                <span className="text-slate-400 text-[11px]">Forgot password?</span>
              </div>
            )}

            {/* Submit / Loading state */}
            {loading ? (
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled
                  className="flex-1 bg-slate-700 text-white font-semibold py-3 rounded-lg text-sm tracking-wide flex items-center justify-center gap-2 opacity-80"
                >
                  <Loader2 size={16} className="animate-spin" />
                  {slowConn ? 'Still connecting…' : 'Processing...'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-3 rounded-lg border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-wider transition-colors"
                  title="Cancel"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full bg-black hover:bg-slate-800 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors text-sm tracking-wide mt-2"
              >
                {tab === 'signin' ? 'Sign In to Crash Guard' : 'Create My Safety Account'}
              </button>
            )}
          </form>

          {/* Social Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold left-1/2 -translate-x-1/2 inline-block">
              or continue with
            </span>
          </div>

          {/* Prominent Full-Width Google Button */}
          <button
            type="button"
            onClick={() => handleSocial(signInWithGoogle)}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-all duration-200 active:scale-[0.99]"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.01 10.04.01 12c0 1.96.45 3.8 1.26 5.42l4.01-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

        </div>

        {/* Footer Brand */}
        <div className="border-t border-slate-100 py-3 text-center text-xs">
          <span className="text-slate-400">Created by </span>
          <span className="text-red-600 font-extrabold">RedHack</span>
        </div>
      </div>
    </div>
  );
}
