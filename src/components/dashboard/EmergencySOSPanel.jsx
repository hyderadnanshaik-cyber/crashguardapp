import React, { useState } from 'react';
import { Shield, AlertOctagon, CheckCircle, Siren, Users, MapPin, Phone, AlertTriangle, ShieldAlert } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { CountdownOverlay } from '../ui/CountdownOverlay';
import ManualCrashModal from './ManualCrashModal';
import { sendOtpEmail } from '../../services/emailDispatchService';

const EmergencySOSPanel = ({ 
  userId, 
  user, 
  emergencyState, 
  severity, 
  countdown, 
  hospitals, 
  onMarkSafe, 
  triggerImpact,
  triggerManualCrash,
  contacts = [] // injected from parent container
}) => {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const isIdle = emergencyState === 'IDLE';

  return (
    <div className="w-full relative space-y-6">
      {/* Show full screen overlay if there is an active emergency */}
      {!isIdle && (
        <CountdownOverlay 
          emergencyState={emergencyState} 
          severity={severity} 
          countdown={countdown} 
          onMarkSafe={onMarkSafe} 
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Status Block */}
        <GlassCard className="p-6 md:p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-emerald-600" />
                System Armed
              </h3>
              <p className="text-sm text-slate-600 mt-1">Crash Guard sensor is actively monitoring.</p>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-full border border-emerald-200">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-6 flex-1">
            <h4 className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">Sensor Telemetry</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-slate-500 text-xs font-semibold">Connection</div>
                <div className="text-slate-900 font-bold text-sm flex items-center gap-1.5 mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span> BLE Active
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs font-semibold">Battery</div>
                <div className="text-emerald-700 font-bold text-sm mt-0.5">87%</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs font-semibold">Accel (Z)</div>
                <div className="text-slate-900 font-bold font-mono text-sm mt-0.5">1.02 G</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs font-semibold">Gyro (X)</div>
                <div className="text-slate-900 font-bold font-mono text-sm mt-0.5">0.05 °/s</div>
              </div>
            </div>
          </div>

          {/* Manual Crash SOS Action Card */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <h4 className="font-extrabold text-sm">Manual Crash Trigger Fallback</h4>
            </div>
            <p className="text-xs text-red-700 leading-snug">
              If your helmet sensor is damaged or disconnected during an impact, trigger an immediate manual alert here.
            </p>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-lg shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <ShieldAlert size={16} />
              <span>MANUAL CRASH TRIGGER 🚨</span>
            </button>

            {/* Test Email & OTP Button */}
            <button
              onClick={async () => {
                const targetEmail = contacts.find(c => c.email)?.email || user?.email;
                if (!targetEmail) {
                  alert('Please add an Emergency Contact with an email address in Profile & Contacts tab first!');
                  return;
                }
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                try {
                  await sendOtpEmail(targetEmail, code);
                  alert(`✅ Test OTP (${code}) sent successfully to ${targetEmail}! Check your inbox.`);
                } catch (err) {
                  const errorMsg = err?.text || err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
                  alert(`Email dispatch notice: ${errorMsg}`);
                }
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <span>📧 Test Emergency Email & Send OTP Code</span>
            </button>
          </div>
        </GlassCard>

        {/* Manual Crash Modal */}
        <ManualCrashModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onConfirmTrigger={(config) => {
            if (triggerManualCrash) triggerManualCrash(config);
          }}
        />

        {/* Contacts & Resources Block */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              Emergency Contacts
            </h3>
            
            <div className="space-y-3">
              {contacts.length > 0 ? (
                contacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-bold text-sm">{contact.name}</span>
                      <span className="text-xs text-slate-500">{contact.phone} • {contact.relationship || contact.relation || 'Contact'}</span>
                    </div>
                    <a href={`tel:${contact.phone}`} className="p-2 bg-white hover:bg-slate-100 rounded-full border border-slate-200 transition-colors text-blue-600 shadow-sm">
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-8 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                  No emergency contacts configured yet.<br/>
                  <span className="text-[11px] text-slate-400">Add emergency contacts in Profile & Contacts.</span>
                </div>
              )}
            </div>
          </GlassCard>

          {!isIdle && hospitals && hospitals.length > 0 && (
            <GlassCard className="p-6 border-red-200 bg-red-50/30">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
                <Siren className="w-5 h-5" />
                Nearby Hospitals
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {hospitals.slice(0, 3).map((h, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="font-bold text-slate-900 text-sm truncate">{h.name}</div>
                    <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {h.distance}km away</span>
                      <span className={h.open ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{h.open ? 'Open' : 'Closed'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencySOSPanel;
