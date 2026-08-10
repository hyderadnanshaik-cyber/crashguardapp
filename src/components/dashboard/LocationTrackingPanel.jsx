import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Share2, Copy, Map, ShieldAlert, CheckCircle, Navigation } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';
import Modal from '../ui/Modal';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon paths in Vite (cannot use require())
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redMotorcycleIcon = new L.Icon({
  iconUrl:    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor:[1, -34],
  shadowSize: [41, 41],
});

// Component to update map center dynamically when location coordinates change
function ChangeMapCenter({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

/**
 * @param {{ userId: string }} props
 */
const LocationTrackingPanel = ({ userId }) => {
  // useLocation expects a userId string
  const { sharingEnabled: isSharing, currentLocation: location, toggleSharing } = useLocation(userId);
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const shareUrl = userId
    ? `${window.location.origin}/track/${userId}`
    : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Toggle & Info Card */}
        <div className="w-full md:w-1/3 flex flex-col gap-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Navigation className="text-red-600 w-5 h-5" />
              Live Location
            </h3>

            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <span className="font-semibold text-slate-800">Share with Family</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isSharing} onChange={toggleSharing} />
                <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <p className={`text-sm ${isSharing ? 'text-emerald-600 font-medium' : 'text-slate-500'} mb-4 flex items-start gap-2`}>
              {isSharing ? (
                <><CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />Broadcasting your live location to authorized contacts.</>
              ) : (
                <><ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />Location sharing is disabled. Family cannot see your location.</>
              )}
            </p>

            {isSharing && shareUrl && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Share Link</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono outline-none"
                  />
                  <GlowButton variant="primary" className="!px-3" onClick={handleCopyLink} title="Copy link">
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </GlowButton>
                </div>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="text-red-600 hover:text-red-700 text-sm font-semibold mt-3 flex items-center gap-1 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Show QR Code
                </button>
              </div>
            )}
          </GlassCard>

          {/* Coordinates card */}
          <GlassCard className="p-5 text-sm text-slate-700 space-y-2">
            <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Current Position</p>
            <p className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Lat:</span>
              <span className="text-slate-900 font-extrabold font-mono text-base">{location?.lat != null ? location.lat.toFixed(6) : 'Searching GPS...'}</span>
            </p>
            <p className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Lon:</span>
              <span className="text-slate-900 font-extrabold font-mono text-base">{location?.lon != null ? location.lon.toFixed(6) : 'Searching GPS...'}</span>
            </p>
            {location?.speed != null && (
              <p className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-semibold">Speed:</span>
                <span className="text-slate-900 font-extrabold font-mono text-base">{Math.round((location.speed || 0) * 3.6)} km/h</span>
              </p>
            )}
          </GlassCard>
        </div>

        {/* Map Container */}
        <div className="w-full md:w-2/3 h-[450px] rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl bg-slate-900">
          {location ? (
            <MapContainer
              center={[location.lat, location.lon]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <ChangeMapCenter center={[location.lat, location.lon]} />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <Marker position={[location.lat, location.lon]} icon={redMotorcycleIcon}>
                <Popup className="dark-popup">
                  <div className="text-sm font-semibold text-gray-900">Rider Position</div>
                  <div className="text-xs text-gray-600">Updated just now</div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-500 absolute inset-0">
              <Map className="w-12 h-12 mb-3 opacity-50 animate-pulse" />
              <p>Waiting for GPS signal…</p>
              <p className="text-xs text-slate-600 mt-1">Check location permissions in your browser</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {showQRModal && (
        <Modal onClose={() => setShowQRModal(false)} title="Share Tracking Link">
          <div className="p-6 flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                alt="QR Code"
                width="200"
                height="200"
              />
            </div>
            <p className="text-sm text-gray-400 text-center">
              Scan this QR code with any smartphone to view the live tracking page.
            </p>
            <GlowButton className="w-full mt-6" onClick={() => setShowQRModal(false)}>Close</GlowButton>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LocationTrackingPanel;
