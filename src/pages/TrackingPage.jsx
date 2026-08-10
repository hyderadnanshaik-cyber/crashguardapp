import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Clock, Activity, Zap } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlowButton } from '../components/ui/GlowButton';
import { HelmetLogo } from '../components/ui/HelmetLogo';
import Footer from '../components/layout/Footer';

// Fix Leaflet default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map recenter component
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.latitude, position.longitude], map.getZoom(), { animate: true });
    }
  }, [position, map]);
  return null;
}

export default function TrackingPage() {
  const { userId } = useParams();
  const [locationData, setLocationData] = useState(null);
  const [riderData, setRiderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setError('Invalid tracking link.');
      setLoading(false);
      return;
    }

    // Fetch rider profile info
    const riderUnsub = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        setRiderData(docSnap.data());
      }
    });

    // Fetch live location
    const locUnsub = onSnapshot(doc(db, 'users', userId, 'live_location', 'current'), (docSnap) => {
      setLoading(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isSharing) {
          setLocationData(data);
        } else {
          setLocationData(null);
        }
      } else {
        setLocationData(null);
      }
    }, (err) => {
      console.error("Error fetching location:", err);
      setError('Could not connect to tracking service.');
      setLoading(false);
    });

    return () => {
      riderUnsub();
      locUnsub();
    };
  }, [userId]);

  // Create pulsing icon for live tracking
  const liveIcon = L.divIcon({
    className: 'live-tracker-icon',
    html: `<div class="relative w-4 h-4">
             <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
             <div class="absolute inset-0 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
           </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      {/* Simple Public Navbar */}
      <header className="p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <HelmetLogo className="w-8 h-8" />
          <span className="font-bold text-white text-lg tracking-wider">CRASH GUARD <span className="text-red-400 text-xs font-bold tracking-widest">by RedHack</span></span>
        </div>
        <GlowButton variant="outline" size="sm" onClick={() => window.location.href = '/'}>
          Get App
        </GlowButton>
      </header>

      <main className="flex-1 flex flex-col relative z-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Tracking Error</h2>
            <p className="text-gray-400">{error}</p>
          </div>
        ) : !locationData ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-gray-500 text-6xl mb-4">📴</div>
            <h2 className="text-2xl font-bold text-white mb-2">Location Unavailable</h2>
            <p className="text-gray-400">
              {riderData?.displayName || 'The rider'} has paused location sharing or is currently offline.
            </p>
          </div>
        ) : (
          <div className="flex-1 relative">
            <MapContainer
              center={[locationData.latitude, locationData.longitude]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <RecenterMap position={locationData} />
              <Marker position={[locationData.latitude, locationData.longitude]} icon={liveIcon}>
                <Popup className="bg-gray-900 border-gray-800 text-white rounded-lg overflow-hidden">
                  <div className="p-2 text-center">
                    <strong>{riderData?.displayName || 'Rider'}</strong>
                    <br />
                    Speed: {Math.round(locationData.speed || 0)} m/s
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Overlay Info Card */}
            <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-10">
              <GlassCard className="p-4 bg-gray-900/90 backdrop-blur-xl border border-gray-700 shadow-2xl">
                <div className="flex items-center gap-4 mb-4">
                  {riderData?.photoURL ? (
                    <img src={riderData.photoURL} alt="Rider" className="w-12 h-12 rounded-full border-2 border-blue-500" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center border-2 border-blue-500 text-blue-200 font-bold text-xl">
                      {(riderData?.displayName || 'R')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-white text-lg">{riderData?.displayName || 'Unknown Rider'}</h3>
                    <div className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      LIVE TRACKING
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-black/50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-400 mb-1" />
                    <span className="text-gray-400 text-xs uppercase">Speed</span>
                    <span className="font-mono text-white">{Math.round((locationData.speed || 0) * 3.6)} km/h</span>
                  </div>
                  <div className="bg-black/50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <Zap className="w-4 h-4 text-yellow-400 mb-1" />
                    <span className="text-gray-400 text-xs uppercase">Accuracy</span>
                    <span className="font-mono text-white">±{Math.round(locationData.accuracy || 0)}m</span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last updated: {locationData.timestamp ? new Date(locationData.timestamp).toLocaleTimeString() : 'Unknown'}
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
