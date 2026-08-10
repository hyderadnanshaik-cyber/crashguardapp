/**
 * @file RHAXMascotTour.jsx
 * @description Floating, moving interactive mascot guide "RHAX".
 * Styled as a sleek futuristic glowing red-and-white safety shield / tech-firefly creature.
 * Physically glides across the screen to target and point at active dashboard elements during guided tour.
 */
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';

/* ── RHAX Futuristic Shield / Firefly Creature SVG ─────────────────────── */
function RHAXCreature({ isWaving = false, emotion = 'happy' }) {
  return (
    <div className="relative w-28 h-28 select-none animate-breathe filter drop-shadow-[0_8px_20px_rgba(220,38,38,0.35)]">
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Floating Outer Halo Ring */}
        <ellipse cx="60" cy="60" rx="52" ry="52" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.6" className="animate-spin" style={{ animationDuration: '12s' }} />

        {/* Energy Firefly Wings */}
        <ellipse cx="25" cy="50" rx="18" ry="10" fill="url(#wing_grad)" opacity="0.7" transform="rotate(-25 25 50)" className="animate-pulse" />
        <ellipse cx="95" cy="50" rx="18" ry="10" fill="url(#wing_grad)" opacity="0.7" transform="rotate(25 95 50)" className="animate-pulse" />

        {/* Safety Shield Body Form */}
        <path
          d="M60 12 L95 28 V60 C95 85 60 108 60 108 C60 108 25 85 25 60 V28 L60 12 Z"
          fill="url(#body_grad)"
          stroke="#dc2626"
          strokeWidth="2.5"
        />

        {/* Inner Shield Plate */}
        <path
          d="M60 20 L87 33 V58 C87 78 60 97 60 97 C60 97 33 78 33 58 V33 L60 20 Z"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="1.5"
        />

        {/* Glowing Tech Visor Screen */}
        <rect x="42" y="42" width="36" height="22" rx="7" fill="#0f172a" stroke="#dc2626" strokeWidth="1.5" />

        {/* Glowing Expressive Eyes */}
        <ellipse cx="52" cy="53" rx="4" ry="4" fill="#dc2626" className="animate-pulse">
          <animate attributeName="ry" values="4;0.8;4" dur="3.2s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="68" cy="53" rx="4" ry="4" fill="#dc2626" className="animate-pulse">
          <animate attributeName="ry" values="4;0.8;4" dur="3.2s" begin="0.1s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="53" cy="52" r="1.5" fill="white" />
        <circle cx="69" cy="52" r="1.5" fill="white" />

        {/* Mouth Indicator */}
        <path d="M54 60 Q60 63 66 60" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />

        {/* Top Antenna Light */}
        <circle cx="60" cy="12" r="4" fill="#dc2626" className="animate-ping" />
        <circle cx="60" cy="12" r="3" fill="#ffffff" />

        {/* Bottom Energy Core Gem */}
        <polygon points="60,74 65,82 60,90 55,82" fill="#dc2626" />

        <defs>
          <linearGradient id="body_grad" x1="25" y1="12" x2="95" y2="108">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#fee2e2" />
          </linearGradient>
          <linearGradient id="wing_grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ── Tour Steps Configuration with Dynamic Target Coordinates ───────────── */
const STEPS = [
  {
    id: 'welcome',
    panel: 'overview',
    title: (name) => `Team RedHack Welcomes You, ${name || 'Rider'}! 🎉`,
    message: "I'm RHAX, your safety guide from RedHack! I'll physically guide you through setting up your personal safety shield. Let's inspect your command center!",
    cta: "Start Guided Tour ⚡",
    emoji: '👋',
    position: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    arrowDir: 'down',
  },
  {
    id: 'profile',
    panel: 'profile',
    title: () => 'Step 1 — Profile & Health Medical Info',
    message: "I've glided over to your Profile section. Be sure to select your Blood Group and Health Insurance details. First responders need this during emergencies!",
    cta: 'Next Target →',
    emoji: '🩺',
    position: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    arrowDir: 'down',
  },
  {
    id: 'contacts',
    panel: 'profile',
    title: () => 'Step 2 — Emergency Contacts',
    message: "Add up to 5 emergency phone numbers here. When a crash is detected, automated SMS alerts & SendGrid emails dispatch with your exact GPS location within seconds!",
    cta: 'Next Target →',
    emoji: '📞',
    position: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    arrowDir: 'down',
  },
  {
    id: 'pairing',
    panel: 'profile',
    title: () => 'Step 3 — Relative Access & QR Code',
    message: "Here is your 6-digit access code and QR code. Share this with family members so they can track your live GPS position on their phones!",
    cta: 'Next Target →',
    emoji: '🔐',
    position: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    arrowDir: 'down',
  },
  {
    id: 'helmet',
    panel: 'telemetry',
    title: () => 'Step 4 — Web Bluetooth Helmet Bridge',
    message: "Tap 'Connect Helmet (BLE)' to pair your ESP32 smart helmet! I'll monitor 3-axis G-force, speed, and satellites in real time.",
    cta: 'Complete Guided Tour 🚀',
    emoji: '⛑️',
    isLast: true,
    position: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    arrowDir: 'down',
  },
];

/* ── Main RHAXMascotTour Component ─────────────────────────────────────── */
export function RHAXMascotTour({ user, onClose, onSetActivePanel }) {
  const [step, setStep] = useState(0);
  const [minimized, setMinimized] = useState(false);

  const current = STEPS[step];
  const name = user?.displayName?.split(' ')[0] || 'Rider';

  // Navigate panel when step changes
  useEffect(() => {
    if (current.panel && onSetActivePanel) {
      onSetActivePanel(current.panel);
    }
  }, [step]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleFinish = () => {
    localStorage.setItem('hasSeenMascotTour', 'true');
    setMinimized(true);
  };

  // If minimized, render floating badge at bottom right
  if (minimized) {
    return (
      <button
        onClick={() => {
          setMinimized(false);
          setStep(0);
        }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white hover:bg-slate-50 border-2 border-red-500 text-slate-900 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 group"
      >
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xs shadow-md animate-pulse">
            ⚡
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
        </div>
        <span className="text-xs font-extrabold text-slate-900 tracking-wide">
          Ask RHAX
        </span>
        <Sparkles size={14} className="text-red-600 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Background soft dim overlay */}
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] pointer-events-auto transition-opacity duration-500" onClick={handleFinish} />

      {/* Floating RHAX Container — viewport-safe on all screen sizes */}
      <div
        className="absolute z-50 pointer-events-auto transition-all duration-700 ease-in-out"
        style={{
          top: current.position.top,
          /* Mobile: clamp to viewport inset; Desktop: use step position */
          left: 'clamp(16px, calc(50% - 160px), calc(100vw - 336px))',
          width: 'min(320px, calc(100vw - 32px))',
        }}
      >
        {/* RHAX Creature (hidden on very small screens to save space) */}
        <div className="hidden sm:flex justify-center mb-2">
          <RHAXCreature isWaving={step === 0} />
        </div>

        {/* Speech Bubble Card — always full width of container */}
        <div className="bg-white border-2 border-slate-200 shadow-2xl rounded-2xl p-5 w-full relative animate-bubble-pop">
          {/* Badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-600">RHAX Shield Guide</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            </div>
            <button
              onClick={handleFinish}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors"
              title="Close tour"
            >
              <X size={14} />
            </button>
          </div>

          {/* Step Emoji & Title */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">{current.emoji}</span>
            <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
              {current.title(name)}
            </h3>
          </div>

          {/* Speech Message */}
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            {current.message}
          </p>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1">
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft size={14} /> Back
                </button>
              )}
            </div>

            <button
              onClick={handleNext}
              className="bg-black hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5 uppercase tracking-wider"
            >
              {current.isLast ? (
                <><CheckCircle2 size={14} /> {current.cta}</>
              ) : (
                <>{current.cta} <ChevronRight size={14} /></>
              )}
            </button>
          </div>

          {/* Step Dots Indicator */}
          <div className="flex justify-center items-center gap-1.5 mt-3">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-300 ${i === step ? 'w-4 h-1.5 bg-red-600' : 'w-1.5 h-1.5 bg-slate-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RHAXMascotTour;
