/**
 * @file BLEStatusCard.jsx
 * @description GoDaddy-style light theme BLE connection status widget for the dashboard.
 */
import React from 'react';
import { Bluetooth, BluetoothOff, BluetoothSearching, Satellite, Battery, AlertTriangle } from 'lucide-react';
import { BLE_STATUS } from '../../hooks/useBLE';
import { isBLESupported } from '../../services/bleService';

export function BLEStatusCard({ status, deviceName, telemetry, onConnect, onDisconnect }) {
  const isSupported  = isBLESupported();
  const isConnected  = status === BLE_STATUS.CONNECTED;
  const isScanning   = status === BLE_STATUS.SCANNING;
  const battery      = telemetry?.battery_pct ?? null;
  const satellites   = telemetry?.satellites ?? 0;
  const speed        = telemetry?.speed_kmh ?? 0;

  const batteryColor =
    battery === null ? '#64748b'
    : battery < 20  ? '#dc2626'
    : battery < 50  ? '#d97706'
    : '#16a34a';

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${isConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            {isScanning
              ? <BluetoothSearching size={20} className="text-blue-600 animate-pulse" />
              : isConnected
                ? <Bluetooth size={20} className="text-emerald-600" />
                : <BluetoothOff size={20} className="text-slate-400" />
            }
          </div>
          <div>
            <p className="text-slate-900 font-bold text-sm">Helmet BLE Connection</p>
            <p className="text-slate-500 text-xs font-mono truncate max-w-[150px]">
              {isConnected ? deviceName || 'CrashGuard_Helmet' : 'Not paired'}
            </p>
          </div>
        </div>

        {/* Animated pulse indicator when connected */}
        <div className="relative flex items-center justify-center w-8 h-8">
          {isConnected && (
            <>
              <span className="absolute w-8 h-8 rounded-full border border-emerald-400 animate-conn-ring" style={{ animationDelay: '0s' }} />
              <span className="absolute w-8 h-8 rounded-full border border-emerald-400 animate-conn-ring" style={{ animationDelay: '0.75s' }} />
            </>
          )}
          <div className={`w-3.5 h-3.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-300'}`} />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Battery */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Battery size={13} style={{ color: batteryColor }} />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Battery</span>
          </div>
          <p className="text-lg font-extrabold font-mono" style={{ color: batteryColor }}>
            {battery !== null ? `${battery}%` : '--'}
          </p>
          {battery !== null && (
            <div className="mt-1.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${battery}%`, backgroundColor: batteryColor }} />
            </div>
          )}
        </div>

        {/* Satellites */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Satellite size={13} className={satellites > 0 ? 'text-blue-600' : 'text-slate-400'} />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sats</span>
          </div>
          <p className={`text-lg font-extrabold font-mono ${satellites > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
            {satellites}
          </p>
          <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{satellites >= 4 ? 'GPS Fixed' : 'Searching'}</p>
        </div>

        {/* Speed */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="mb-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Speed</span>
          </div>
          <p className="text-lg font-extrabold font-mono text-slate-900">{speed}</p>
          <p className="text-[9px] text-slate-500 font-semibold mt-0.5">km/h</p>
        </div>
      </div>

      {/* HTTP / Mobile Web Bluetooth Warning */}
      {!isSupported && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 font-medium">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Web Bluetooth Unavailable</p>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
              Web Bluetooth requires a Secure Context (<span className="font-mono">https://</span> or <span className="font-mono">localhost</span>). On mobile HTTP IP addresses, Chrome disables Bluetooth APIs. Please connect via Chrome on PC (<span className="font-mono">localhost</span>) or use HTTPS.
            </p>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isScanning || !isSupported}
        className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
          isConnected
            ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800'
            : isScanning
              ? 'bg-blue-50 border border-blue-200 text-blue-700 cursor-wait'
              : !isSupported
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-black hover:bg-slate-800 text-white shadow-sm'
        }`}
      >
        {isScanning ? 'Scanning for Helmet…'
          : isConnected ? 'Disconnect Helmet'
          : !isSupported ? 'BLE Disabled on HTTP'
          : 'Connect Helmet (BLE)'}
      </button>
    </div>
  );
}

export default BLEStatusCard;
