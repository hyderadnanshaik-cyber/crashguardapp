/**
 * @file RHAXScooterMascot.jsx
 * @description Pristine HD Mascot Companion & Tour System — Crash Guard by RedHack.
 *
 * DESIGN ARCHITECTURE:
 * 1. PRISTINE HD RENDERING: Uses original, unedited image files (/rhax_riding_pristine.png & /rhax_standing_pristine.jpg).
 *    NO Canvas keying, NO color thresholding, NO mix-blend-mode.
 * 2. ELEGANT CARD EMBEDDING & BADGING: Mascot images are rendered inside sleek, styled container cards with smooth rounded corners, border accents, and subtle drop shadows.
 * 3. POST-LOGIN SPLASH BLUR: Step 0 renders heavy backdrop blur (blur(12px)) + centered welcome card.
 * 4. DUAL-IMAGE TAB MAPPING:
 *    - Image 1 (Riding Scooter): Tabs 1 & 2 (Overview & Telemetry) with horizontal speed lines.
 *    - Image 2 (Standing Robot): Tabs 3-8 (Location, Emergency, Hospitals, Relatives, Logs, Profile).
 * 5. BRANDING RULES: Zero mentions of AI. Script: "Hi, I am RHAX, guiding you on behalf of RedHack."
 */
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

/* ── Tour Steps ───────────────────────────────────────────────────────────── */
const TOUR_STEPS = [
  // ── Step 0: Initial Welcome Splash Modal (Centered with heavy blur)
  {
    id: 'welcome',
    panel: 'overview',
    mode: 'riding',
    isSplash: true,
    emoji: '🛵',
    title: 'Welcome to Crash Guard!',
    message: 'Hi, I am RHAX, guiding you on behalf of RedHack. I will walk you through every feature of Crash Guard so you are fully protected on every ride. Let\'s begin your tour!',
    cta: "Start Tour →",
  },
  // ── Step 1: Dashboard Overview
  {
    id: 'overview',
    panel: 'overview',
    mode: 'riding',
    emoji: '📊',
    title: '1. Dashboard Overview',
    message: 'Your Command Center. View live BLE helmet status, 3-axis G-force telemetry, and quick-action pills to share location or pair relatives in one tap.',
    cta: 'Next Tab →',
    containerStyle: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    cardFirst: true,
    arrowDir: 'up',
  },
  // ── Step 2: Live Telemetry
  {
    id: 'telemetry',
    panel: 'telemetry',
    mode: 'riding',
    emoji: '⚡',
    title: '2. Live Telemetry',
    message: 'Real-time G-force vectors stream from your helmet sensor over BLE. When the resultant force spikes above the crash threshold, an emergency is triggered automatically.',
    cta: 'Next Tab →',
    containerStyle: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    cardFirst: true,
    arrowDir: 'up',
  },
  // ── Step 3: Location Tracking
  {
    id: 'location',
    panel: 'location',
    mode: 'standing',
    emoji: '🗺️',
    title: '3. Location Tracking',
    message: 'Your live GPS position renders on the Leaflet map. Toggle "Start Sharing" to generate a public link so family can watch your ride in real time.',
    cta: 'Next Tab →',
    containerStyle: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    cardFirst: true,
    arrowDir: 'up',
  },
  // ── Step 4: Emergency SOS & Countdown
  {
    id: 'emergency',
    panel: 'emergency',
    mode: 'standing',
    emoji: '🚨',
    title: '4. Emergency SOS',
    message: 'When a crash is detected, a 15s/30s/45s countdown begins before dispatching SMS, email, and FCM push alerts to contacts. Press "I AM SAFE" to cancel.',
    cta: 'Next Tab →',
    containerStyle: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    cardFirst: true,
    arrowDir: 'up',
  },
  // ── Step 5: Hospital Finder
  {
    id: 'hospitals',
    panel: 'hospitals',
    mode: 'standing',
    emoji: '🏥',
    title: '5. Hospital Finder',
    message: 'Google Places scans for nearby trauma centers around your GPS location. Each card provides a direct-dial phone button for 1-tap emergency calls.',
    cta: 'Next Tab →',
    containerStyle: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    cardFirst: true,
    arrowDir: 'up',
  },
  // ── Step 6: Relative Zone & Pairing
  {
    id: 'relatives',
    panel: 'relatives',
    mode: 'standing',
    emoji: '🔐',
    title: '6. Relative Zone',
    message: 'Share your 6-digit access code or QR code with relatives. Once paired, they receive push notifications and live GPS tracking when an incident occurs.',
    cta: 'Next Tab →',
    containerStyle: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    cardFirst: true,
    arrowDir: 'up',
  },
  // ── Step 7: Audit Logs
  {
    id: 'logs',
    panel: 'logs',
    mode: 'standing',
    emoji: '📜',
    title: '7. Audit Logs',
    message: 'Every G-force incident, SOS trigger, and cancelled alarm is recorded in Firestore with precise timestamps, severity levels, and GPS coordinates.',
    cta: 'Next Tab →',
    containerStyle: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    cardFirst: true,
    arrowDir: 'up',
  },
  // ── Step 8: Profile & Contacts
  {
    id: 'profile',
    panel: 'profile',
    mode: 'standing',
    emoji: '👤',
    title: '8. Profile & Contacts',
    message: 'Set your blood group, health insurance, and up to 5 emergency contacts. All SOS alerts dispatch to these contacts simultaneously. Setup complete — ride safe! 🛵',
    cta: 'Finish Setup 🚀',
    isLast: true,
    containerStyle: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
    cardFirst: true,
    arrowDir: 'up',
  },
];

/* ── Context Guidance ──────────────────────────────────────────────────────── */
const CONTEXT_GUIDANCE = {
  overview:  { mode: 'riding',   emoji: '📊', title: 'Dashboard Overview', message: 'Monitoring BLE helmet status & G-force data in real time.' },
  telemetry: { mode: 'riding',   emoji: '⚡', title: 'Live Telemetry',      message: 'High-speed sensor telemetry active — resultant G-force vectors streaming.' },
  location:  { mode: 'standing', emoji: '🗺️', title: 'Location Tracking',  message: 'Toggle GPS sharing to generate your live tracking link for family.' },
  emergency: { mode: 'standing', emoji: '🚨', title: 'Emergency SOS',       message: 'Crash detected → countdown → multi-channel alert dispatch. "I AM SAFE" to cancel.' },
  hospitals: { mode: 'standing', emoji: '🏥', title: 'Hospital Finder',     message: 'Nearest trauma centers found. Tap any card to dial directly.' },
  relatives: { mode: 'standing', emoji: '🔐', title: 'Relative Zone',       message: 'Share 6-digit code or QR — paired relatives get live alerts & tracking.' },
  logs:      { mode: 'standing', emoji: '📜', title: 'Audit Logs',          message: 'Full Firestore incident history with severity, timestamp & GPS per crash.' },
  profile:   { mode: 'standing', emoji: '👤', title: 'Profile & Contacts',  message: 'Keep blood group, insurance & emergency contacts up to date for dispatch.' },
};

/* ── Arrow Indicator Styles ────────────────────────────────────────────────── */
const ARROW_STYLES = {
  up: {
    width: 0, height: 0,
    borderLeft: '9px solid transparent',
    borderRight: '9px solid transparent',
    borderBottom: '10px solid white',
    position: 'absolute',
    top: -10, left: 20,
    filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.08))',
  },
  down: {
    width: 0, height: 0,
    borderLeft: '9px solid transparent',
    borderRight: '9px solid transparent',
    borderTop: '10px solid white',
    position: 'absolute',
    bottom: -10, left: 20,
    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.08))',
  },
};

/* ── Main Component ───────────────────────────────────────────────────────── */
export function RHAXScooterMascot({ activePanel = 'overview', userName = 'Rider', onSetActivePanel }) {
  const [minimized, setMinimized] = useState(false);
  const [tourStep,  setTourStep]  = useState(null); // null = context mode, 0 = splash, 1-8 = tabs

  /* Auto-launch splash tour once on first login */
  useEffect(() => {
    const seen = localStorage.getItem('rhax_tour_completed');
    if (!seen) {
      setTourStep(0);
    }
  }, []);

  /* Synchronize active panel with parent dashboard when tour advances */
  useEffect(() => {
    if (tourStep !== null && TOUR_STEPS[tourStep] && onSetActivePanel) {
      onSetActivePanel(TOUR_STEPS[tourStep].panel);
    }
  }, [tourStep, onSetActivePanel]);

  const isTourActive = tourStep !== null;
  const currentStep  = isTourActive ? TOUR_STEPS[tourStep] : null;
  const isSplash     = isTourActive && currentStep?.isSplash;
  const ctxData      = CONTEXT_GUIDANCE[activePanel] || CONTEXT_GUIDANCE.overview;

  const mode     = isTourActive ? currentStep.mode : ctxData.mode;
  const isRiding = mode === 'riding';

  // Strict pristine asset mapping
  const mascotImgSrc = isRiding ? '/rhax_riding_pristine.png' : '/rhax_standing_pristine.jpg';

  /* Handlers */
  const handleNext = () => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(s => s + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (tourStep > 0) {
      setTourStep(s => s - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem('rhax_tour_completed', 'true');
    setTourStep(null);
  };

  const restartTour = () => {
    localStorage.removeItem('rhax_tour_completed');
    setTourStep(0);
    setMinimized(false);
  };

  /* ── Minimized Badge Component ───────────────────────────────────────── */
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2.5 bg-white hover:bg-slate-50 border-2 border-red-500 text-slate-900 px-3 py-2 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 group"
        title="Open RHAX Guide"
      >
        {/* Properly framed avatar — explicit dimensions, overflow-hidden, bg fallback */}
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-red-400 bg-slate-900 shrink-0 flex items-center justify-center">
          <img
            src="/rhax_riding_pristine.png"
            alt="RHAX"
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        <span className="text-xs font-extrabold text-slate-900 tracking-wide whitespace-nowrap">Guide RHAX 🛵</span>
        <Sparkles size={13} className="text-red-600 group-hover:rotate-12 transition-transform shrink-0" />
      </button>
    );
  }

  /* ── STEP 0: INITIAL LOGIN SPLASH BLUR & CENTRED WELCOME MODAL ────────────── */
  if (isSplash) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Heavy Cinematic Backdrop Blur Overlay */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[12px] transition-all duration-500"
          onClick={completeTour}
        />

        {/* Centered Welcome Card */}
        <div className="relative z-10 bg-white border-2 border-slate-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-bubble-pop text-center space-y-5">
          {/* Pristine Mascot Frame */}
          <div className="relative w-44 h-44 mx-auto rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg bg-slate-900">
            <div className="absolute inset-0 overflow-hidden flex flex-col justify-around py-1 px-1 pointer-events-none z-10">
              <div className="h-0.5 rounded-full animate-speed-line-1 opacity-80" style={{ background: 'linear-gradient(90deg, #ef4444 0%, #fff 60%, transparent 100%)' }} />
              <div className="h-1 rounded-full animate-speed-line-2 opacity-90" style={{ background: 'linear-gradient(90deg, #dc2626 0%, #fca5a5 50%, transparent 100%)' }} />
              <div className="h-0.5 rounded-full animate-speed-line-3 opacity-70" style={{ background: 'linear-gradient(90deg, #fff 0%, #f87171 60%, transparent 100%)' }} />
            </div>
            <img
              src="/rhax_riding_pristine.png"
              alt="RHAX Mascot"
              className="w-full h-full object-cover animate-breathe"
            />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider">
              Safety Companion
            </span>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              {currentStep.title}
            </h3>
            <p className="text-sm text-slate-600 font-semibold leading-relaxed">
              {currentStep.message}
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3 justify-center">
            <button
              onClick={handleNext}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>{currentStep.cta}</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={completeTour}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip Intro & Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ── STEPS 1-8 + CONTEXT MODE: DOCKED GUIDANCE CARD & MASCOT ────────────────── */
  // Context (non-tour) mode: docked bottom-right, small compact card only
  const containerStyle = isTourActive
    ? {
        position: 'fixed',
        zIndex: 45,
        // Clamp all tour positions to safe viewport area
        top: currentStep.containerStyle?.top ?? '80px',
        left: 'clamp(16px, calc(50% - 152px), calc(100vw - 320px))',
        transform: 'none',
      }
    : {
        position: 'fixed',
        zIndex: 45,
        bottom: '16px',
        right: '16px',
      };

  const cardFirst = isTourActive ? currentStep.cardFirst : true;
  const arrowDir  = isTourActive ? currentStep.arrowDir  : 'down';

  const GuidanceCard = (
    <div className="relative bg-white border-2 border-slate-200 shadow-2xl rounded-2xl p-4 pointer-events-auto animate-bubble-pop"
      style={{ width: 'min(288px, calc(100vw - 32px))' }}
    >
      {/* Arrow Indicator */}
      {arrowDir && <div style={ARROW_STYLES[arrowDir]} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full animate-pulse ${isTourActive ? 'bg-emerald-500' : isRiding ? 'bg-red-500' : 'bg-blue-500'}`} />
          <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isTourActive ? 'text-emerald-600' : isRiding ? 'text-red-600' : 'text-blue-600'}`}>
            {isTourActive
              ? `Tour Step ${tourStep} / ${TOUR_STEPS.length - 1}`
              : isRiding ? 'Speed Mode ⚡' : 'Guide Mode 🛑'}
          </span>
        </div>
        <button
          onClick={() => isTourActive ? completeTour() : setMinimized(true)}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors"
          title={isTourActive ? 'Exit Tour' : 'Minimize'}
        >
          <X size={14} />
        </button>
      </div>

      {/* Title */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xl leading-none">{isTourActive ? currentStep.emoji : ctxData.emoji}</span>
        <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
          {isTourActive ? currentStep.title : ctxData.title}
        </h4>
      </div>

      {/* Message */}
      <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
        {isTourActive ? currentStep.message : ctxData.message}
      </p>

      {/* Controls */}
      {isTourActive ? (
        <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-100">
          {tourStep > 1 ? (
            <button
              onClick={handlePrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
            >
              <ChevronLeft size={11} /> Back
            </button>
          ) : <div />}
          <button
            onClick={handleNext}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg shadow-sm transition-all uppercase tracking-wider"
          >
            {currentStep.isLast ? 'Finish 🚀' : <>{currentStep.cta} <ChevronRight size={11} /></>}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
          <button onClick={restartTour} className="text-emerald-600 font-bold hover:underline">
            Restart Tour 🗺️
          </button>
          <span className={`font-mono font-bold uppercase ${isRiding ? 'text-red-600' : 'text-blue-600'}`}>
            {isRiding ? '▶ Riding' : '⏸ Standing'}
          </span>
        </div>
      )}
    </div>
  );

  const MascotAvatar = (
    /* Render mascot avatar on all screen sizes */
    <div className="relative flex items-end justify-center w-16 h-16 sm:w-28 sm:h-28 pointer-events-auto shrink-0">
      {/* Speed lines — Image 1 Riding mode only */}
      {isRiding && (
        <div className="absolute inset-0 overflow-hidden flex flex-col justify-around py-1 px-1 pointer-events-none z-10">
          <div className="h-0.5 rounded-full animate-speed-line-1 opacity-80" style={{ background: 'linear-gradient(90deg, #ef4444 0%, #fff 60%, transparent 100%)' }} />
          <div className="h-1 rounded-full animate-speed-line-2 opacity-90" style={{ background: 'linear-gradient(90deg, #dc2626 0%, #fca5a5 50%, transparent 100%)' }} />
          <div className="h-0.5 rounded-full animate-speed-line-3 opacity-70" style={{ background: 'linear-gradient(90deg, #fff 0%, #f87171 60%, transparent 100%)' }} />
        </div>
      )}
      {/* Pristine Mascot Image Frame — explicit dimensions + bg fallback */}
      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-xl bg-slate-900 relative shrink-0">
        <img
          src={mascotImgSrc}
          alt="RHAX Mascot"
          className={`w-full h-full object-cover transition-all duration-300 ${isRiding ? 'animate-breathe' : 'hover:scale-105'}`}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      </div>
    </div>
  );

  return (
    <div
      style={{
        ...containerStyle,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        pointerEvents: 'none',
        // Clamp max width to viewport
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {cardFirst ? (
        <>
          {GuidanceCard}
          {MascotAvatar}
        </>
      ) : (
        <>
          {MascotAvatar}
          {GuidanceCard}
        </>
      )}
    </div>
  );
}

export default RHAXScooterMascot;
