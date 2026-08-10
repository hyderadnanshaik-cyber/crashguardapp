/**
 * @file MascotGuide.jsx
 * @description Animated RedHack robot mascot for the guided onboarding tour (Light Theme).
 */
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

/* ── Animated Robot Mascot SVG ─────────────────────────────────────────── */
function RobotMascot({ isWaving = false, step = 0 }) {
  return (
    <div className={`relative w-32 h-36 select-none ${isWaving ? 'animate-breathe' : 'animate-float'}`}>
      <svg
        viewBox="0 0 120 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full mascot-glow"
      >
        {/* Antennae */}
        <line x1="60" y1="8" x2="60" y2="20" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="60" cy="7" r="3.5" fill="#dc2626" className="animate-pulse">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
        </circle>

        {/* Helmet visor */}
        <rect x="25" y="20" width="70" height="55" rx="18" fill="#0f172a" stroke="#dc2626" strokeWidth="2"/>
        <rect x="28" y="23" width="64" height="49" rx="16" fill="#1e293b"/>
        <rect x="33" y="28" width="54" height="36" rx="10" fill="#020817"/>
        <rect x="33" y="28" width="54" height="36" rx="10" fill="url(#visor_grad_light)" opacity="0.5"/>
        {/* Eye sockets */}
        <ellipse cx="48" cy="44" rx="8" ry="8" fill="#0f172a"/>
        <ellipse cx="72" cy="44" rx="8" ry="8" fill="#0f172a"/>
        {/* Glowing eyes */}
        <ellipse cx="48" cy="44" rx="5" ry="5" fill="#dc2626">
          <animate attributeName="ry" values="5;1;5" dur="3.5s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="72" cy="44" rx="5" ry="5" fill="#dc2626">
          <animate attributeName="ry" values="5;1;5" dur="3.5s" begin="0.1s" repeatCount="indefinite"/>
        </ellipse>
        {/* Eye pupils */}
        <circle cx="48" cy="44" r="2.5" fill="white" opacity="0.9"/>
        <circle cx="72" cy="44" r="2.5" fill="white" opacity="0.9"/>
        {/* Mouth */}
        {step === 0
          ? <path d="M44 58 Q60 67 76 58" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          : <rect x="45" y="58" width="30" height="4" rx="2" fill="#16a34a" opacity="0.9"/>
        }
        <rect x="25" y="37" width="70" height="4" fill="#dc2626" opacity="0.3" rx="2"/>
        <rect x="40" y="20" width="40" height="5" rx="2.5" fill="#dc2626" opacity="0.5"/>

        {/* Body */}
        <rect x="30" y="78" width="60" height="48" rx="12" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5"/>
        <rect x="38" y="86" width="44" height="28" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
        <rect x="42" y="90" width="36" height="8" rx="4" fill="#dc2626" opacity="0.15"/>
        <rect x="42" y="90" width={`${Math.min(36, 10 + step * 6)}`} height="8" rx="4" fill="#dc2626" opacity="0.8"/>
        <circle cx="50" cy="107" r="2.5" fill="#dc2626" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="60" cy="107" r="2.5" fill="#16a34a" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.2s" begin="0.4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="70" cy="107" r="2.5" fill="#2563eb" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.2s" begin="0.8s" repeatCount="indefinite"/>
        </circle>

        {/* Left arm */}
        <g style={{ transformOrigin: '30px 88px', animation: step === 0 ? 'waveHand 2.5s ease-in-out infinite' : 'none' }}>
          <rect x="14" y="82" width="18" height="36" rx="9" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5"/>
          <circle cx="23" cy="122" r="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5"/>
        </g>
        {/* Right arm */}
        <rect x="88" y="82" width="18" height="36" rx="9" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5"/>
        <circle cx="97" cy="122" r="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5"/>

        {/* Legs */}
        <rect x="38" y="126" width="18" height="12" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5"/>
        <rect x="64" y="126" width="18" height="12" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5"/>
        <rect x="34" y="135" width="22" height="5" rx="2.5" fill="#94a3b8"/>
        <rect x="64" y="135" width="22" height="5" rx="2.5" fill="#94a3b8"/>

        <defs>
          <linearGradient id="visor_grad_light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.2"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ── Tour steps config ──────────────────────────────────────────────────── */
const STEPS = [
  {
    id:       'welcome',
    panel:    null,
    title:    (name) => `Team RedHack Welcomes You, ${name || 'Rider'}! 🎉`,
    message:  "I'm RHAX, your safety navigator from RedHack! Let's set up your personal safety shield in 4 quick steps. Your family and emergency teams will be ready to respond the moment you need them.",
    cta:      "Let's Go! ⚡",
    emoji:    '👋',
  },
  {
    id:       'profile',
    panel:    'profile',
    title:    () => 'Step 1 — Your Safety Profile',
    message:  "Head to Profile & Contacts. Add your Blood Group, Health Insurance details, and a profile photo. Emergency medical teams need this instantly.",
    cta:      'Got it, Next →',
    emoji:    '🩺',
  },
  {
    id:       'contacts',
    panel:    'profile',
    title:    () => 'Step 2 — Emergency Contacts',
    message:  "Add up to 5 emergency numbers (family, friends, colleagues). When a crash is detected, they'll receive automated SMS alerts and emails with your GPS location within seconds.",
    cta:      'Next →',
    emoji:    '📞',
  },
  {
    id:       'pairing',
    panel:    'profile',
    title:    () => 'Step 3 — Relative Access Portal',
    message:  "Share your 6-digit access code with family members so they can track your real-time GPS on their devices. Generate a QR code in your Profile — it takes 10 seconds!",
    cta:      'Next →',
    emoji:    '🔐',
  },
  {
    id:       'helmet',
    panel:    'telemetry',
    title:    () => 'Step 4 — Connect Your Smart Helmet',
    message:  "Go to Live Telemetry and tap \"Connect Helmet (BLE)\". Your ESP32 helmet will pair in seconds. I'll monitor G-force, GPS, and battery — all in real time!",
    cta:      'Finish Setup! 🚀',
    emoji:    '⛑️',
    isLast:   true,
  },
];

/* ── Main Component ─────────────────────────────────────────────────────── */
export function MascotGuide({ user, userName, onClose, onSetActivePanel }) {
  const [step,    setStep]    = useState(0);
  const [exiting, setExiting] = useState(false);

  const current = STEPS[step];
  const name    = user?.displayName?.split(' ')[0] || (typeof userName === 'string' ? userName.split(' ')[0] : 'Rider');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (current.panel && onSetActivePanel) {
      onSetActivePanel(current.panel);
    }
  }, [step]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  };

  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const finish = () => {
    setExiting(true);
    localStorage.setItem('hasSeenMascotTour', 'true');
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100 animate-fade-in'}`}
    >
      <div className="relative w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden animate-fade-in">
        {/* Red accent strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />

        {/* Skip button */}
        <button onClick={finish}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
          <X size={18} />
        </button>

        {/* RedHack badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600">RHAX Guide</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
        </div>

        {/* Content area */}
        <div className="px-8 pt-12 pb-8 flex flex-col items-center gap-5">
          <RobotMascot isWaving={step === 0} step={step} />

          <div className="text-4xl">{current.emoji}</div>

          {/* Speech bubble */}
          <div className="relative w-full animate-bubble-pop">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center shadow-sm">
              <h3 className="text-slate-900 font-bold text-base mb-2 leading-snug">
                {current.title(name)}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {current.message}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2.5 bg-red-600' : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'}`} />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 w-full">
            {step > 0 && (
              <button onClick={prev}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-sm font-semibold transition-colors">
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <button onClick={next}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 text-white bg-black hover:bg-slate-800 shadow-md">
              {current.isLast ? <><CheckCircle2 size={16} />{current.cta}</> : <>{current.cta}<ChevronRight size={16} /></>}
            </button>
          </div>

          <p className="text-slate-400 text-[11px] font-mono font-semibold">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-8 py-3 flex items-center justify-between bg-slate-50 text-xs">
          <span className="text-slate-500">Powered by</span>
          <span className="font-extrabold text-red-600 tracking-wider">REDHACK</span>
        </div>
      </div>
    </div>
  );
}

export default MascotGuide;
