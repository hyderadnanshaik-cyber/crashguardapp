/**
 * @file RelativeZonePanel.jsx
 * @description Dedicated Relative Access & Pairing Tab (#6).
 * Features:
 * - Rider's 6-digit access code display
 * - Interactive QR Code generator for relative pairing
 * - Relative device pairing status & FCM token binding list
 */
import React, { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { QrCode, Shield, Copy, Check, Users, Smartphone, Key, Info } from 'lucide-react';

import { getDeterministicAccessCode } from '../../utils/accessCode';
import { RIDER_CODE_MAP } from '../../utils/riderCodes';

export default function RelativeZonePanel({ userId, user }) {
  const [accessCode, setAccessCode] = useState('------');
  const [copied, setCopied] = useState(false);
  const [pairedRelatives, setPairedRelatives] = useState([]);

  useEffect(() => {
    if (!userId || !db) return;

    const deterministicCode = getDeterministicAccessCode(userId);
    setAccessCode(deterministicCode);

    // Fetch or generate user access code
    const userRef = doc(db, 'users', userId);
    const unsubUser = onSnapshot(userRef, async (snap) => {
      let codeToUse = deterministicCode;
      if (snap.exists() && snap.data().accessCode) {
        const stored = snap.data().accessCode;
        // Ignore hardware claim codes (RDxxx) for relative pairing
        if (!RIDER_CODE_MAP[stored]) {
          codeToUse = stored;
        }
      }
      if (codeToUse === deterministicCode) {
        try {
          await setDoc(userRef, { accessCode: deterministicCode }, { merge: true });
        } catch (e) {
          console.error('[RelativeZone] Error creating user doc with accessCode:', e);
        }
      }
      setAccessCode(codeToUse);
    });

    // Listen to paired relatives subcollection
    const relRef = collection(db, 'users', userId, 'paired_relatives');
    const unsubRel = onSnapshot(relRef, (snap) => {
      const list = [];
      snap.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      setPairedRelatives(list);
    });

    return () => {
      unsubUser();
      unsubRel();
    };
  }, [userId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pairingUrl = `${window.location.origin}/track/${userId}?code=${accessCode}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pairingUrl)}`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <QrCode className="w-7 h-7 text-emerald-600" />
            Relative Access & Pairing Portal
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Allow family members to monitor your live telemetry, GPS location, and impact alerts on their devices.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <Shield size={14} />
          <span>FCM Multicast Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 6-Digit Access Code & Share Link */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-500">
              <Key size={18} className="text-slate-700" />
              <span className="text-xs font-bold uppercase tracking-wider">Your Relative Access Code</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Relatives enter this 6-digit code on their portal to bind their FCM push notifications.
            </p>

            {/* Access Code Box */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-5 text-center flex items-center justify-between">
              <span className="text-4xl font-black font-mono tracking-[0.25em] text-slate-900">
                {accessCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shadow-sm"
                title="Copy Access Code"
              >
                {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Direct Tracking URL</span>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 break-all text-xs text-blue-600 font-mono">
              <a href={pairingUrl} target="_blank" rel="noreferrer" className="hover:underline">
                {pairingUrl}
              </a>
            </div>
          </div>
        </div>

        {/* QR Code Generator Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Family Scan QR Code
            </span>
            <p className="text-xs text-slate-500 mb-4">
              Relatives can scan this QR code with any smartphone camera to launch the relative tracking portal.
            </p>

            <div className="bg-white p-3 rounded-xl border-2 border-slate-200 shadow-md inline-block mb-3">
              <img
                src={qrApiUrl}
                alt="Relative Pairing QR Code"
                className="w-44 h-44 object-contain"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-mono">
            Scan to bind FCM Push Token instantly
          </p>
        </div>
      </div>

      {/* Paired Relative Devices List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-slate-900" />
            <h3 className="text-base font-bold text-slate-900">Paired Relative Devices</h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {pairedRelatives.length} Device{pairedRelatives.length === 1 ? '' : 's'} Active
          </span>
        </div>

        {pairedRelatives.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            <Smartphone className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No Relatives Paired Yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Share your 6-digit access code <span className="font-mono font-bold text-slate-900">{accessCode}</span> with family members.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pairedRelatives.map((rel) => (
              <div key={rel.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{rel.name || 'Family Member Device'}</p>
                  <p className="text-[11px] text-slate-500 font-mono">FCM Token Linked • {rel.pairedAt ? new Date(rel.pairedAt).toLocaleDateString() : 'Active'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
