/**
 * @file HospitalFinderPanel.jsx
 * @description Light theme Hospital Finder panel with session state persistence & interactive Leaflet map.
 */
import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Navigation, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchNearbyHospitals } from '../../services/emergencyService';

// Fix for default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redHospitalIcon = new L.Icon({
  iconUrl:    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor:[1, -34],
  shadowSize: [41, 41],
});

const blueUserIcon = new L.Icon({
  iconUrl:    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl:  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor:[1, -34],
  shadowSize: [41, 41],
});

function ChangeMapCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// ── SESSION CACHE MANAGEMENT ──────────────────────────────────────────────
const CACHE_KEY = 'crashguard_hospital_finder_cache';

const loadCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[HospitalFinder] Cache load error:', e);
  }
  return {
    hospitals: [],
    searched: false,
    radius: 5,
    error: null,
    userLocation: null,
  };
};

let memoryCache = loadCache();

const updateCache = (data) => {
  memoryCache = { ...memoryCache, ...data };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch (e) {
    console.warn('[HospitalFinder] Cache save error:', e);
  }
};

export default function HospitalFinderPanel() {
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState(memoryCache.hospitals);
  const [searched, setSearched] = useState(memoryCache.searched);
  const [radius, setRadius] = useState(memoryCache.radius);
  const [error, setError] = useState(memoryCache.error);
  const [userLocation, setUserLocation] = useState(memoryCache.userLocation);

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    updateCache({ radius: newRadius });
  };

  const handleFindHospitals = () => {
    setLoading(true);
    setError(null);
    setSearched(true);

    if (!navigator.geolocation) {
      const err = 'Geolocation is not supported by your browser.';
      setError(err);
      updateCache({ error: err, searched: true });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
        setUserLocation(coords);
        try {
          const results = await fetchNearbyHospitals(coords, radius * 1000);
          setHospitals(results);
          updateCache({
            hospitals: results,
            searched: true,
            radius,
            error: null,
            userLocation: coords,
          });
        } catch (err) {
          const msg = err.message || 'Failed to fetch hospitals.';
          setError(msg);
          updateCache({ error: msg, searched: true });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        const msg = 'Unable to retrieve your location. Please check browser permissions.';
        setError(msg);
        updateCache({ error: msg, searched: true });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Determine initial map center (user location or first hospital or SF default)
  const defaultCenter = userLocation
    ? [userLocation.lat, userLocation.lon]
    : hospitals.length > 0 && hospitals[0].location
    ? [hospitals[0].location.lat, hospitals[0].location.lng]
    : [37.7749, -122.4194];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-red-600" />
              Trauma Hospital Finder
            </h2>
            <p className="text-slate-600 text-sm mt-1">Locate and route to nearby emergency medical facilities.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-300 w-full sm:w-auto">
              <MapPin className="w-4 h-4 text-slate-500 ml-1" />
              <select
                value={radius}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 border-none outline-none pr-2 py-0.5 cursor-pointer w-full"
              >
                <option value={1}>1 km Radius</option>
                <option value={5}>5 km Radius</option>
                <option value={10}>10 km Radius</option>
                <option value={20}>20 km Radius</option>
              </select>
            </div>
            
            <button 
              onClick={handleFindHospitals} 
              disabled={loading}
              className="w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2 bg-black hover:bg-slate-800 text-white font-medium py-2.5 px-5 rounded-md text-xs uppercase tracking-wider transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scanning Area...</>
              ) : searched ? (
                <><RefreshCw className="w-4 h-4" /> Refresh Scan</>
              ) : (
                <><Navigation className="w-4 h-4" /> Find Nearby Hospitals</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-700 text-xs mb-6 font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Interactive Map View for Hospitals & User Location */}
        {hospitals.length > 0 && (
          <div className="w-full h-[320px] rounded-xl overflow-hidden border border-slate-200 shadow-sm mb-6 relative z-0">
            <MapContainer
              center={defaultCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <ChangeMapCenter center={defaultCenter} />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              />

              {/* User Location Marker */}
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lon]} icon={blueUserIcon}>
                  <Popup>
                    <div className="text-xs font-bold text-slate-900">Your Location</div>
                    <div className="text-[11px] text-slate-600">Scan Center Point</div>
                  </Popup>
                </Marker>
              )}

              {/* Hospital Markers */}
              {hospitals.map((h, i) => {
                const lat = h.location?.lat || h.lat;
                const lng = h.location?.lng || h.lng;
                if (!lat || !lng) return null;
                return (
                  <Marker key={i} position={[lat, lng]} icon={redHospitalIcon}>
                    <Popup>
                      <div className="text-sm font-bold text-slate-900">{h.name}</div>
                      <div className="text-xs text-slate-600 my-1">{h.vicinity}</div>
                      <div className="text-xs font-semibold text-red-600">{h.distance} km away</div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}

        {searched && !loading && !error && hospitals.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Trauma Hospitals Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try expanding your search radius to 10km or 20km.</p>
          </div>
        )}

        {/* Hospital Result Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hospitals.map((hospital, index) => (
            <div key={index} className="bg-slate-50 rounded-xl p-5 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-base font-bold text-slate-900 leading-tight pr-2">
                    {hospital.name}
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${hospital.open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {hospital.open ? 'OPEN NOW' : 'CLOSED'}
                  </span>
                </div>
                
                <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>{hospital.vicinity || hospital.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-800">{hospital.distance} km away</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-200 mt-auto">
                <a 
                  href={`tel:${hospital.phone || '911'}`} 
                  className="flex-1 flex justify-center items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 py-2 rounded-md transition-colors text-xs font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Facility
                </a>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.location?.lat || hospital.lat},${hospital.location?.lng || hospital.lng}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md transition-colors text-xs font-semibold shadow-sm"
                >
                  <Navigation className="w-3.5 h-3.5" /> Directions
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
