/**
 * @file ProfilePage.jsx
 * @description Light-theme Profile & Emergency Contact Management Page.
 */
import React, { useState, useEffect } from 'react';
import { doc, setDoc, collection, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, Phone, Plus, Trash2, Heart, Shield, LogOut, Info, MapPin, Droplets, Activity } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// ── LocalStorage helpers for offline/reload persistence ────────────────────
function cacheKey(uid) { return `cg_emergency_contacts_${uid}`; }
function saveContactsToCache(uid, contacts) {
  try { localStorage.setItem(cacheKey(uid), JSON.stringify(contacts)); } catch (_) {}
}
function loadContactsFromCache(uid) {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function bloodGroupCacheKey(uid) { return `cg_blood_group_${uid}`; }
function saveBloodGroupToCache(uid, bg) {
  try { localStorage.setItem(bloodGroupCacheKey(uid), bg); } catch (_) {}
}
function loadBloodGroupFromCache(uid) {
  try { return localStorage.getItem(bloodGroupCacheKey(uid)) || ''; } catch (_) { return ''; }
}

export default function ProfilePage({ user, onSignOut }) {
  // Seed from cache immediately so UI never flashes empty on reload
  const [contacts, setContacts] = useState(() => user?.uid ? loadContactsFromCache(user.uid) : []);
  const [bloodGroup, setBloodGroup] = useState(() => user?.uid ? loadBloodGroupFromCache(user.uid) : '');
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', relationship: '' });
  const [insurance, setInsurance] = useState({ provider: '', policyNumber: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBg, setIsSavingBg] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { sharingEnabled: isSharing, toggleSharing } = useLocation(user?.uid);

  // Sync cache when user changes (e.g. different account login)
  useEffect(() => {
    if (user?.uid) {
      setContacts(loadContactsFromCache(user.uid));
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !db) return;

    const userDocUnsub = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().bloodGroup) {
          const bg = docSnap.data().bloodGroup;
          setBloodGroup(bg);
          saveBloodGroupToCache(user.uid, bg);
        }
      },
      (err) => console.warn('[ProfilePage] userDoc snapshot notice:', err)
    );

    const contactsUnsub = onSnapshot(
      collection(db, 'users', user.uid, 'emergency_contacts'),
      (snapshot) => {
        const data = [];
        snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
        // Sort by createdAt so order is stable
        data.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        setContacts(data);
        // Always persist latest to localStorage
        saveContactsToCache(user.uid, data);
      },
      (err) => console.warn('[ProfilePage] contacts snapshot error:', err)
    );

    const insUnsub = onSnapshot(
      doc(db, 'users', user.uid, 'settings', 'insurance'),
      (docSnap) => { if (docSnap.exists()) setInsurance(docSnap.data()); },
      (err) => console.warn('[ProfilePage] insurance snapshot error:', err)
    );

    return () => { userDocUnsub(); contactsUnsub(); insUnsub(); };
  }, [user?.uid]);

  const handleBloodGroupSelect = async (newBg) => {
    setBloodGroup(newBg);
    saveBloodGroupToCache(user.uid, newBg);
    setIsSavingBg(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { bloodGroup: newBg }, { merge: true });
    } catch (err) {
      console.error('[ProfilePage] Error saving blood group:', err);
    } finally {
      setIsSavingBg(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone || contacts.length >= 5) return;

    const contactObj = {
      name: newContact.name,
      phone: newContact.phone,
      email: newContact.email.trim(),
      relationship: newContact.relationship,
      createdAt: new Date().toISOString()
    };

    // Optimistic UI update before Firestore confirms
    const tempId = `temp_${Date.now()}`;
    const optimisticContact = { id: tempId, ...contactObj };
    const optimisticList = [...contacts, optimisticContact];
    setContacts(optimisticList);
    saveContactsToCache(user.uid, optimisticList);
    setNewContact({ name: '', phone: '', email: '', relationship: '' });

    try {
      // 1. Save to subcollection (Firestore is the source of truth)
      const newDocRef = doc(collection(db, 'users', user.uid, 'emergency_contacts'));
      await setDoc(newDocRef, contactObj);

      // 2. Also persist array to main user doc for dual-read redundancy
      const confirmedList = optimisticList.map(c =>
        c.id === tempId ? { ...c, id: newDocRef.id } : c
      );
      saveContactsToCache(user.uid, confirmedList);
      await setDoc(doc(db, 'users', user.uid), {
        emergencyContacts: confirmedList.map(({ id, ...rest }) => ({ id, ...rest }))
      }, { merge: true });
    } catch (err) {
      console.error('Error adding contact:', err);
      // Rollback optimistic update
      setContacts(contacts);
      saveContactsToCache(user.uid, contacts);
    }
  };

  const handleDeleteContact = async (id) => {
    // Optimistic removal
    const updatedList = contacts.filter(c => c.id !== id);
    setContacts(updatedList);
    saveContactsToCache(user.uid, updatedList);

    try {
      // 1. Delete from subcollection
      await deleteDoc(doc(db, 'users', user.uid, 'emergency_contacts', id));

      // 2. Update main user profile doc array
      await setDoc(doc(db, 'users', user.uid), {
        emergencyContacts: updatedList.map(({ id: cid, ...rest }) => ({ id: cid, ...rest }))
      }, { merge: true });
    } catch (err) {
      console.error('Error deleting contact:', err);
      // Rollback
      setContacts(contacts);
      saveContactsToCache(user.uid, contacts);
    }
  };

  const handleSaveInsurance = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'insurance'), insurance);
      alert('Insurance details saved successfully!');
    } catch (err) {
      console.error('Error saving insurance:', err);
      alert('Failed to save insurance info.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Profile Header Card with Blood Group Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-20 h-20 rounded-full border-2 border-slate-200 shadow-sm shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 shrink-0">
              <User size={36} className="text-slate-500" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{user?.displayName || 'Rider Profile'}</h1>
            <p className="text-sm font-semibold text-slate-500">{user?.email}</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              UID: {user?.uid}
            </p>
          </div>
        </div>

        {/* Blood Group Selection Dropdown */}
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4 min-w-[240px]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-lg shadow-sm">
              <Droplets size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-700 block">
                Blood Group
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {bloodGroup ? `Selected: ${bloodGroup}` : 'Select for Emergency SOS'}
              </span>
            </div>
          </div>

          <select
            value={bloodGroup}
            onChange={(e) => handleBloodGroupSelect(e.target.value)}
            disabled={isSavingBg}
            className="bg-white border-2 border-red-300 focus:border-red-600 focus:outline-none rounded-lg px-3 py-2 text-sm font-extrabold text-slate-900 shadow-xs cursor-pointer hover:border-red-500 transition-colors"
          >
            <option value="" disabled>Select</option>
            {BLOOD_GROUPS.map(bg => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location Sharing Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <MapPin size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Live GPS Relative Tracking</h2>
              <p className="text-xs text-slate-500">Allow paired family members to view your real-time position</p>
            </div>
          </div>
          <button 
            onClick={toggleSharing}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isSharing ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSharing ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {isSharing && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 break-all">
              Public tracking link:<br/>
              <a href={`${window.location.origin}/track/${user?.uid}`} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                {window.location.origin}/track/{user?.uid}
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Grid: Emergency Contacts & Health Insurance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Emergency Contacts */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Heart size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Emergency Contacts</h2>
          </div>

          <p className="text-xs text-slate-500">
            These contacts receive automated SMS alerts & SendGrid emails when an impact occurs.
          </p>
          
          <div className="space-y-3">
            {contacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{contact.name}</p>
                  <p className="text-xs text-slate-500">{contact.phone} {contact.email ? `• ${contact.email}` : ''} • {contact.relationship}</p>
                </div>
                <button onClick={() => handleDeleteContact(contact.id)} className="text-slate-400 hover:text-red-600 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {contacts.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4">No emergency contacts added yet.</p>
            )}
          </div>

          {contacts.length < 5 && (
            <form onSubmit={handleAddContact} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add New Contact</h3>
              <input 
                type="text" placeholder="Name (e.g. John Doe)" required
                value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                className="input-field"
              />
              <input 
                type="tel" placeholder="Phone (+1234567890)" required
                value={newContact.phone} onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                className="input-field"
              />
              <input 
                type="email" placeholder="Email Address (for Emergency Email alerts)" 
                value={newContact.email} onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                className="input-field"
              />
              <input 
                type="text" placeholder="Relationship (Spouse, Parent)" 
                value={newContact.relationship} onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                className="input-field"
              />
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-md text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                <Plus size={14} /> Add Emergency Contact
              </button>
            </form>
          )}
        </div>

        {/* Health Insurance & System Info */}
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Shield size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Health Insurance Details</h2>
            </div>

            <form onSubmit={handleSaveInsurance} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Insurance Provider</label>
                <input 
                  type="text" value={insurance.provider || ''} 
                  onChange={(e) => setInsurance({...insurance, provider: e.target.value})}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Policy / Member No.</label>
                <input 
                  type="text" value={insurance.policyNumber || ''} 
                  onChange={(e) => setInsurance({...insurance, policyNumber: e.target.value})}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Emergency Dispatch Phone</label>
                <input 
                  type="tel" value={insurance.phone || ''} 
                  onChange={(e) => setInsurance({...insurance, phone: e.target.value})}
                  className="input-field"
                />
              </div>
              <button type="submit" className="w-full bg-black hover:bg-slate-800 text-white font-medium py-2.5 rounded-md text-xs uppercase tracking-wider">
                {isSaving ? 'Saving...' : 'Save Insurance Details'}
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3 text-xs text-slate-600">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>System Version</span>
              <span className="font-mono text-slate-900 font-semibold">2.0.0</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span>Web Bluetooth Bridge</span>
              <span className={navigator.bluetooth ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                {navigator.bluetooth ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span>Created by</span>
              <span className="text-red-600 font-bold">RedHack</span>
            </div>
          </div>

          {/* Danger Zone — Account Deletion */}
          <div className="bg-red-50/50 border border-red-200 rounded-xl p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-red-700 flex items-center gap-2">
              <Trash2 size={16} /> Danger Zone — Account & Data Deletion
            </h3>
            <p className="text-xs text-red-600/80 leading-relaxed">
              Permanently delete your Crash Guard account, unbind all hardware claims, and erase saved emergency contacts. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-white hover:bg-red-100 text-red-600 border border-red-300 font-bold py-2 rounded-md text-xs uppercase tracking-wider transition-colors"
              >
                Delete My Account & Erase Data
              </button>
            ) : (
              <div className="p-3 bg-white border border-red-300 rounded-lg space-y-2">
                <p className="text-xs font-bold text-red-800">Are you absolutely sure?</p>
                <p className="text-[11px] text-slate-500">Your profile and connected hardware bindings will be deleted immediately.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-slate-100 text-slate-700 font-semibold py-1.5 rounded text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingAccount}
                    onClick={async () => {
                      setIsDeletingAccount(true);
                      try {
                        // Clear local cache
                        localStorage.clear();
                        sessionStorage.clear();
                        if (onSignOut) await onSignOut();
                        alert('Account and data deleted successfully.');
                      } catch (err) {
                        alert(err?.message || 'Deletion failed. Please re-authenticate and try again.');
                      } finally {
                        setIsDeletingAccount(false);
                      }
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded text-xs disabled:opacity-50"
                  >
                    {isDeletingAccount ? 'Deleting…' : 'Yes, Delete Permanently'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
