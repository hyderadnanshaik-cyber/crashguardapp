/**
 * @file DashboardPage.jsx
 * @description Light Theme Command Center Dashboard for Crash Guard by RedHack.
 * Features:
 * - ALL 9 EXPLICIT TABS IN SIDEBAR (Overview, Telemetry, Location, Emergency, Hospitals, Relatives, Logs, Hardware, Profile)
 * - Hardware Restriction Guard — all tabs locked until Rider Access Code is verified
 * - Official Scooter Mascot "RHAX" Integration
 * - BLE Status Card, Dynamic G-Force Waveform, Quick Command Actions Tray
 */
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  LayoutDashboard, Activity, MapPin, AlertOctagon,
  Building2, FileText, User, Menu, X, LogOut, ShieldCheck,
  QrCode, Share2, Zap, Radio, ArrowRight, Users, TestTube, Cpu, ArrowLeftRight,
  Lock
} from 'lucide-react';
import { useHardwareClaim } from '../hooks/useHardwareClaim';
import HardwareOwnershipPanel from '../components/dashboard/HardwareOwnershipPanel';
import { HelmetLogo } from '../components/ui/HelmetLogo';
import { useBLE, BLE_STATUS } from '../hooks/useBLE';
import { useEmergency, EMERGENCY_STATE } from '../hooks/useEmergency';
import { useLocation } from '../hooks/useLocation';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { BLEStatusBadge } from '../components/ui/BLEStatusBadge';
import { CountdownOverlay } from '../components/ui/CountdownOverlay';
import BLEStatusCard from '../components/dashboard/BLEStatusCard';
import GForceChart from '../components/charts/GForceChart';
import LiveTelemetryPanel from '../components/dashboard/LiveTelemetryPanel';
import EmergencySOSPanel from '../components/dashboard/EmergencySOSPanel';
import LocationTrackingPanel from '../components/dashboard/LocationTrackingPanel';
import HospitalFinderPanel from '../components/dashboard/HospitalFinderPanel';
import RelativeZonePanel from '../components/dashboard/RelativeZonePanel';
import AuditLogsPanel from '../components/dashboard/AuditLogsPanel';
import RHAXScooterMascot from '../components/mascot/RHAXScooterMascot';
import Footer from '../components/layout/Footer';
import Modal from '../components/ui/Modal';
import ManualCrashModal from '../components/dashboard/ManualCrashModal';

import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { publishRiderTelemetry } from '../services/riderPublisherService';

const ProfilePage = lazy(() => import('./ProfilePage'));

export default function DashboardPage({ user, onSignOut, onSwitchRole }) {
  // ── Hardware Restriction Guard ─────────────────────────────────────────────
  const { isClaimed } = useHardwareClaim(user?.uid);

  const [activePanel, setActivePanel] = useState('hardware');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  useEffect(() => {
    if (!user?.uid || !db) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'emergency_contacts'), (snapshot) => {
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setEmergencyContacts(data);
    });
    return () => unsub();
  }, [user?.uid]);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    emergencyState,
    severity,
    countdown,
    hospitals,
    triggerImpact,
    triggerManualCrash,
    markSafe,
  } = useEmergency(user?.uid, user, emergencyContacts);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const {
    status: bleStatus,
    deviceName,
    telemetry,
    connect: connectHelmet,
    disconnect: disconnectHelmet,
    isSupported: isBLESupported,
  } = useBLE(triggerImpact, markSafe); // markSafe is called ONLY on hardware CRASH→ARMED transition

  const {
    sharingEnabled: isSharing,
    currentLocation: location,
    toggleSharing,
  } = useLocation(user?.uid);

  const { logs } = useAuditLogs(user?.uid);

  const isConnected = bleStatus === BLE_STATUS.CONNECTED;

  // ── Stream Rider Telemetry to Watchers in Real-Time (15s Heartbeat) ─────────
  // NOTE: interval is 15s to stay within Firestore free-tier quota limits.
  // State changes (crash, BLE connect) still publish immediately via dep changes.
  useEffect(() => {
    if (!user?.uid) return;

    const stream = () => {
      const isCrash = emergencyState === 'ALERT';
      publishRiderTelemetry(user.uid, user, {
        lat: location?.lat ?? null,
        lon: location?.lon ?? null,
        speed: location?.speed ? (location.speed * 3.6) : (telemetry?.speed || 0),
        battery: telemetry?.battery ?? 100,
        bleConnected: isConnected,
        isBleConnected: isConnected,
        isAppOpen: true,
        gForce: telemetry?.resultantForce ?? telemetry?.gforce ?? 0,
        status: isCrash ? 'CRASH' : (isConnected ? 'ARMED' : 'ONLINE'),
      }).catch(console.warn);
    };

    stream();
    const interval = setInterval(stream, 15000);
    return () => clearInterval(interval);
  }, [user, location, telemetry, bleStatus, emergencyState, isConnected]);


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ── ALL 9 EXPLICIT FEATURE TABS IN SIDEBAR ─────────────────────────────────
  const navItems = [
    { id: 'overview',   label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'telemetry',  label: 'Live Telemetry',     icon: Activity },
    { id: 'location',   label: 'Location Tracking',  icon: MapPin },
    { id: 'emergency',  label: 'Emergency SOS',      icon: AlertOctagon },
    { id: 'hospitals',  label: 'Hospital Finder',    icon: Building2 },
    { id: 'relatives',  label: 'Relative Zone',      icon: Users },
    { id: 'logs',       label: 'Audit Logs',         icon: FileText },
    { id: 'hardware',   label: 'Hardware & Ownership', icon: Cpu },
    { id: 'profile',    label: 'Profile & Contacts', icon: User },
  ];

  // ── Force hardware tab when unclaimed ─────────────────────────────────────
  useEffect(() => {
    if (!isClaimed) {
      setActivePanel('hardware');
    } else if (isClaimed && activePanel === 'hardware') {
      // After successful claim, auto-route to overview
      setActivePanel('overview');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClaimed]);

  const handleNavClick = useCallback((id) => {
    // Block navigation to non-hardware tabs when unclaimed
    if (!isClaimed && id !== 'hardware' && id !== 'profile') return;
    setActivePanel(id);
    setIsSidebarOpen(false);
  }, [isClaimed]);

  // ── Quick Actions Tray Handlers ─────────────────────────────────────────────
  const handleQuickConnect = () => {
    if (isConnected) disconnectHelmet();
    else connectHelmet(user?.displayName || user?.email?.split('@')[0] || 'Rider');
  };

  const handleQuickShare = () => {
    if (!isSharing) toggleSharing();
    setActivePanel('location');
  };

  const handleQuickPairing = () => {
    setActivePanel('relatives');
  };

  const handleQuickLogs = () => {
    setActivePanel('logs');
  };

  // ── Render Dashboard Overview (Home View) ──────────────────────────────────
  const renderOverview = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <Zap size={14} className="fill-current animate-pulse text-red-600 shrink-0" />
              <span>Crash Guard Active System</span>
            </div>
            <h2 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
              Rider Portal — {user?.displayName || 'Active Rider'}
            </h2>
            <p className="text-xs text-slate-500 font-mono truncate">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • System Status: Nominal
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <BLEStatusBadge status={bleStatus} deviceName={deviceName} />
            <button
              onClick={handleQuickConnect}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                isConnected
                  ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800'
                  : 'bg-black hover:bg-slate-800 text-white shadow-sm'
              }`}
            >
              {isConnected ? 'Disconnect BLE' : 'Connect Helmet'}
            </button>
          </div>
        </div>

        {/* Quick Command Actions Tray (Light Pill Buttons) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 px-1">
            Quick Command Actions
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleQuickConnect}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold py-2.5 px-4 rounded-full text-xs transition-colors"
            >
              <Radio size={15} />
              <span>{isConnected ? 'Disconnect BLE' : 'Connect Helmet'}</span>
            </button>

            <button
              onClick={handleQuickShare}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold py-2.5 px-4 rounded-full text-xs transition-colors"
            >
              <Share2 size={15} />
              <span>{isSharing ? 'Sharing Active' : 'Share Location'}</span>
            </button>

            <button
              onClick={handleQuickPairing}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold py-2.5 px-4 rounded-full text-xs transition-colors"
            >
              <QrCode size={15} />
              <span>Relative Pairing</span>
            </button>

            <button
              onClick={handleQuickLogs}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-full text-xs transition-colors"
            >
              <FileText size={15} />
              <span>View Audit Logs</span>
            </button>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 border border-red-700 text-white font-extrabold py-2.5 px-4 rounded-full text-xs transition-all shadow-md shadow-red-600/30 active:scale-95"
            >
              <AlertOctagon size={15} />
              <span>Manual Crash SOS</span>
            </button>
          </div>
        </div>

        {/* Primary Hardware & Telemetry Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* BLE Hardware Status Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <BLEStatusCard
              status={bleStatus}
              deviceName={deviceName}
              telemetry={telemetry}
              onConnect={() => connectHelmet(user?.displayName || user?.email?.split('@')[0] || 'Rider')}
              onDisconnect={disconnectHelmet}
            />
          </div>

          {/* Real-time G-Force Waveform Chart (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <GForceChart gforce={telemetry?.resultantForce} isDemo={!isConnected} />
          </div>
        </div>

        {/* Emergency SOS & Hospital Search Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between border-l-4 border-l-red-600">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-red-600">Emergency SOS</span>
                <AlertOctagon className="text-red-600 animate-pulse" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Automated Incident Dispatch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an impact occurs, dynamic countdown triggers instant SMS, FCM relative push notifications, and email alerts.
              </p>
            </div>

            <button
              onClick={() => setActivePanel('emergency')}
              className="mt-5 w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Manage Emergency SOS Settings</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between border-l-4 border-l-blue-600">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Trauma Medical Network</span>
                <Building2 className="text-blue-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Google Places Hospital Finder</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically scans 1km to 20km radius for nearest trauma hospitals and direct ambulance dispatch numbers.
              </p>
            </div>

            <button
              onClick={() => setActivePanel('hospitals')}
              className="mt-5 w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Search Nearby Hospitals</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Panel Switcher (All 8 Tabs Handled Explicitly) ─────────────────────────
  const renderContent = () => {
    switch (activePanel) {
      case 'overview':
        return renderOverview();
      case 'telemetry':
        return (
          <LiveTelemetryPanel
            status={bleStatus}
            deviceName={deviceName}
            telemetry={telemetry}
            onConnect={() => connectHelmet(user?.displayName || user?.email || 'Rider')}
            onDisconnect={disconnectHelmet}
            isSupported={isBLESupported}
          />
        );
      case 'location':
        return <LocationTrackingPanel userId={user?.uid} />;
      case 'emergency':
        return (
          <EmergencySOSPanel
            userId={user?.uid}
            user={user}
            emergencyState={emergencyState}
            severity={severity}
            countdown={countdown}
            hospitals={hospitals}
            onMarkSafe={markSafe}
            triggerImpact={triggerImpact}
            triggerManualCrash={triggerManualCrash}
            contacts={emergencyContacts}
          />
        );
      case 'hospitals':
        return <HospitalFinderPanel />;
      case 'relatives':
        return <RelativeZonePanel userId={user?.uid} user={user} />;
      case 'logs':
        return <AuditLogsPanel user={user} logs={logs} />;
      case 'hardware':
        return <HardwareOwnershipPanel user={user} onClaimed={() => setActivePanel('overview')} />;
      case 'profile':
        return (
          <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Profile...</div>}>
            <ProfilePage user={user} onSignOut={onSignOut} />
          </Suspense>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Full-Screen Emergency Countdown Overlay */}
      {emergencyState !== EMERGENCY_STATE.IDLE && (
        <CountdownOverlay
          emergencyState={emergencyState}
          severity={severity}
          countdown={countdown}
          hospitals={hospitals}
          onMarkSafe={markSafe}
          emergencyContacts={emergencyContacts}
        />
      )}

      {/* Manual Crash SOS Modal — accessible from Quick Commands tray */}
      <ManualCrashModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onConfirmTrigger={(config) => triggerManualCrash(config)}
      />

      {/* Official Scooter Mascot RHAX */}
      <RHAXScooterMascot
        activePanel={activePanel}
        userName={user?.displayName || 'Rider'}
        onSetActivePanel={setActivePanel}
      />

      {/* Main Command Center Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <HelmetLogo className="w-7 h-7" />
            <span className="font-extrabold text-slate-900 text-base tracking-tight">
              CRASH GUARD <span className="text-red-600 font-bold text-xs">by RedHack</span>
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Navigation Sidebar"
            className="text-slate-700 hover:text-slate-900 min-w-[48px] min-h-[48px] flex items-center justify-center -mr-2"
          >
            {isSidebarOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {/* Mobile Backdrop Overlay */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-35 bg-slate-900/50 backdrop-blur-xs md:hidden animate-fade-in"
          />
        )}

        {/* GoDaddy Style Light Sidebar — ALL 8 TABS LISTED */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200
          transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static flex flex-col shadow-xl md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Sidebar Header */}
          <div className="hidden md:flex items-center gap-3 p-6 border-b border-slate-100">
            <HelmetLogo className="w-8 h-8" />
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">CRASH GUARD</span>
              <p className="text-red-600 text-[9px] font-bold tracking-[0.25em] uppercase">by RedHack</p>
            </div>
          </div>

          {/* Navigation Items (9 explicit tabs) with hardware lock guard */}
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            {/* Hardware registration prompt when unclaimed */}
            {!isClaimed && (
              <div className="mb-3 mx-1 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                <Lock size={11} className="text-red-600 shrink-0 animate-pulse" />
                <span className="text-[10px] font-bold text-red-700 leading-tight">
                  Register hardware to unlock all features
                </span>
              </div>
            )}
            {navItems.map((item) => {
              const isLocked = !isClaimed && item.id !== 'hardware' && item.id !== 'profile';
              const isHardwareTab = item.id === 'hardware';
              const isActive = activePanel === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  disabled={isLocked}
                  title={isLocked ? 'Register hardware unit to unlock' : item.label}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : isLocked
                        ? 'text-slate-300 cursor-not-allowed opacity-50'
                        : isHardwareTab && !isClaimed
                          ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {isLocked ? (
                    <Lock size={16} className="text-slate-300 shrink-0" />
                  ) : (
                    <item.icon
                      size={18}
                      className={`shrink-0 ${
                        item.id === 'emergency' && emergencyState !== EMERGENCY_STATE.IDLE
                          ? 'text-red-500 animate-pulse'
                          : isHardwareTab && !isClaimed
                            ? 'text-red-600 animate-pulse'
                            : ''
                      }`}
                    />
                  )}
                  <span className="flex-1 text-left">{item.label}</span>
                  {isHardwareTab && !isClaimed && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Rider Portal — role badge & actions */}
          <div className="p-4 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center gap-2 px-4 py-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Rider Portal</span>
            </div>
            {onSwitchRole && (
              <button
                onClick={onSwitchRole}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition-colors"
              >
                <ArrowLeftRight size={18} />
                <span>Switch Role</span>
              </button>
            )}
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Desktop Header */}
          <header className="hidden md:flex items-center justify-between p-4 bg-white border-b border-slate-200 z-10">
            <h1 className="text-lg font-extrabold text-slate-900 capitalize">
              {activePanel === 'overview' ? 'Dashboard Command Center' : navItems.find(n => n.id === activePanel)?.label || activePanel}
            </h1>
            <div className="flex items-center gap-4">
              <BLEStatusBadge status={bleStatus} deviceName={deviceName} />
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <span className="text-sm font-bold text-slate-800">{user?.displayName || user?.email || 'Rider'}</span>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                    <User size={16} />
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Dynamic Content Main Panel */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-slate-50">
            <div className="max-w-6xl mx-auto pb-24 md:pb-16">
              {renderContent()}
            </div>
          </main>

          {/* Persistent Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}
