/**
 * @file App.jsx
 * @description Root application shell with dual-portal architecture.
 *
 * Launch flow:
 *   1. CinematicSplash runs on EVERY boot (unmounts after ~10s).
 *   2. While splash plays, useAuth resolves in the background (max 2s).
 *   3. After splash:
 *      - Not logged in (first visit) → force AuthModal.
 *      - Not logged in (returning)   → landing page.
 *      - Logged in, no role stored   → RoleGateway ("Who Are You?").
 *      - Logged in, role = 'rider'   → /dashboard (Rider Portal).
 *      - Logged in, role = 'watcher' → /watcher  (Watcher Portal).
 *   4. New registrations → mascot auto-opens once; subsequent visits suppress it.
 */
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AuthModal    from './components/auth/AuthModal';
import RoleGateway  from './components/auth/RoleGateway';
import CinematicSplash from './components/ui/CinematicSplash';
import { registerOnlineSyncListener } from './services/offlineQueue';
import { HelmetLogo } from './components/ui/HelmetLogo';
import { ErrorBoundary } from './components/ErrorBoundary';

// ── Lazy-loaded pages ────────────────────────────────────────────────────────
const LandingPage       = lazy(() => import('./pages/LandingPage'));
const DashboardPage     = lazy(() => import('./pages/DashboardPage'));
const WatcherDashboard  = lazy(() => import('./pages/WatcherDashboard'));
const TrackingPage      = lazy(() => import('./pages/TrackingPage'));

// ── localStorage keys ────────────────────────────────────────────────────────
const LS_HAS_VISITED   = 'cg_has_visited';
const LS_MASCOT_SEEN   = 'cg_mascot_seen';
const LS_ROLE          = 'cg_role';           // 'rider' | 'watcher'
const LS_WATCHER_CODE  = 'cg_watcher_code';   // 6-digit code for watcher

// ── Minimal loading fallback ─────────────────────────────────────────────────
function PageLoader() {
  const [showEscape, setShowEscape] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowEscape(true), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-2 border-red-600/30 flex items-center justify-center bg-white shadow-md">
          <HelmetLogo className="w-10 h-10 animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-t-2 border-red-500 animate-spin" />
        <div className="absolute inset-0 bg-red-600 opacity-10 blur-xl rounded-full" />
      </div>
      <p className="text-slate-600 font-bold font-mono tracking-widest text-xs animate-pulse">
        LOADING CRASH GUARD...
      </p>
      {showEscape && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <p className="text-slate-500 text-xs text-center max-w-xs">
            Taking longer than expected.{' '}
            <button
              onClick={() => window.location.reload()}
              className="text-red-600 font-semibold underline underline-offset-2 hover:text-red-700"
            >
              Reload the page
            </button>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
          >
            Reload Now
          </button>
        </div>
      )}
    </div>
  );
}

// ── Protected route guard ────────────────────────────────────────────────────
const ProtectedRoute = ({ user, loading, children }) => {
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  return children;
};

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, isNewUser, signOut } = useAuth();

  // ── Splash state ──────────────────────────────────────────────────────────
  const [splashDone, setSplashDone] = useState(false);

  // ── Auth modal state ──────────────────────────────────────────────────────
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthForced,    setIsAuthForced]    = useState(false);

  // ── Role gateway state ────────────────────────────────────────────────────
  // shown when user is logged in but has no stored role
  const [showRoleGateway, setShowRoleGateway] = useState(false);
  const [selectedRole,    setSelectedRole]    = useState(
    () => localStorage.getItem(LS_ROLE) || null
  );

  // ── Mascot auto-show state ────────────────────────────────────────────────
  const [showMascotOnboard, setShowMascotOnboard] = useState(false);

  // ── After splash completes → decide routing ───────────────────────────────
  useEffect(() => {
    if (!splashDone || loading) return;

    const hasVisited = localStorage.getItem(LS_HAS_VISITED);
    const mascotSeen = localStorage.getItem(LS_MASCOT_SEEN);
    const role       = localStorage.getItem(LS_ROLE);

    const isPublicTrackRoute = window.location.pathname.startsWith('/track/');

    if (!hasVisited && !user && !isPublicTrackRoute) {
      // First-time visitor, not logged in → show auth modal (dismissible)
      setIsAuthForced(true);
      setIsAuthModalOpen(true);
    } else if (user) {
      localStorage.setItem(LS_HAS_VISITED, '1');

      if (!role) {
        // Logged in but no role chosen → show gateway
        setShowRoleGateway(true);
      } else {
        setSelectedRole(role);
        setShowRoleGateway(false);
      }

      // Auto-show mascot only for brand-new registrations, once ever
      if (isNewUser && !mascotSeen) {
        setShowMascotOnboard(true);
      }
    }
  }, [splashDone, loading, user, isNewUser]);

  // When user signs in successfully
  const handleAuthSuccess = () => {
    localStorage.setItem(LS_HAS_VISITED, '1');
    setIsAuthModalOpen(false);
    setIsAuthForced(false);
    const role = localStorage.getItem(LS_ROLE);
    if (!role) {
      setShowRoleGateway(true);
    } else {
      setSelectedRole(role);
      setShowRoleGateway(false);
      window.location.replace(role === 'watcher' ? '/watcher' : '/dashboard');
    }
  };

  // When role is selected from the gateway
  const handleRoleSelected = (role) => {
    localStorage.setItem(LS_ROLE, role);
    setSelectedRole(role);
    setShowRoleGateway(false);
    window.location.replace(role === 'watcher' ? '/watcher' : '/dashboard');
  };

  // Switch role — clears stored role and shows gateway
  const handleSwitchRole = () => {
    localStorage.removeItem(LS_ROLE);
    localStorage.removeItem(LS_WATCHER_CODE);
    setSelectedRole(null);
    setShowRoleGateway(true);
  };

  // When mascot is dismissed
  const handleMascotDismiss = () => {
    localStorage.setItem(LS_MASCOT_SEEN, '1');
    setShowMascotOnboard(false);
  };

  // Handle sign out — clear role too
  const handleSignOut = async () => {
    localStorage.removeItem(LS_ROLE);
    localStorage.removeItem(LS_WATCHER_CODE);
    setSelectedRole(null);
    setShowRoleGateway(false);
    await signOut();
  };

  // Online sync
  useEffect(() => {
    if (user) registerOnlineSyncListener();
  }, [user]);

  return (
    <>
      {/* Cinematic splash — always mounts first, self-removes */}
      {!splashDone && (
        <CinematicSplash onComplete={() => setSplashDone(true)} />
      )}

      {/* Role Gateway overlay — shown above everything after auth */}
      {splashDone && showRoleGateway && user && (
        <RoleGateway user={user} onRoleSelected={handleRoleSelected} />
      )}

      {/* Main app shell */}
      <div style={{ visibility: splashDone ? 'visible' : 'hidden' }}>
        <BrowserRouter>
          <div className="app-container min-h-screen bg-slate-50 font-sans selection:bg-red-500/30">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ── Public ── */}
                  <Route
                    path="/"
                    element={
                      user && selectedRole
                        ? <Navigate to={selectedRole === 'watcher' ? '/watcher' : '/dashboard'} replace />
                        : <LandingPage
                            user={user}
                            onSignOut={handleSignOut}
                            onDashboardClick={() => {
                              const role = localStorage.getItem(LS_ROLE);
                              if (!role) {
                                setShowRoleGateway(true);
                              } else {
                                setSelectedRole(role);
                                window.location.replace(role === 'watcher' ? '/watcher' : '/dashboard');
                              }
                            }}
                            onOpenAuth={() => {
                              setIsAuthForced(false);
                              setIsAuthModalOpen(true);
                            }}
                          />
                    }
                  />

                  {/* ── Rider Portal ── */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute user={user} loading={loading}>
                        <DashboardPage
                          user={user}
                          onSignOut={handleSignOut}
                          onSwitchRole={handleSwitchRole}
                          showMascotOnboard={showMascotOnboard}
                          onMascotDismiss={handleMascotDismiss}
                        />
                      </ProtectedRoute>
                    }
                  />

                  {/* ── Watcher Portal ── */}
                  <Route
                    path="/watcher"
                    element={
                      <ProtectedRoute user={user} loading={loading}>
                        <WatcherDashboard
                          user={user}
                          onSignOut={handleSignOut}
                        />
                      </ProtectedRoute>
                    }
                  />

                  {/* ── Public tracking page ── */}
                  <Route path="/track/:userId" element={<TrackingPage />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>

            {/* Auth Modal */}
            <AuthModal
              isOpen={isAuthModalOpen}
              isForced={isAuthForced}
              onClose={() => {
                setIsAuthModalOpen(false);
                setIsAuthForced(false);
              }}
              onSuccess={handleAuthSuccess}
            />
          </div>
        </BrowserRouter>
      </div>
    </>
  );
}
