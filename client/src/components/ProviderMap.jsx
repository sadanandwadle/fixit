import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, MapPin, Navigation, ExternalLink } from 'lucide-react';

// Create custom DOM/SVG Marker Icons using L.divIcon
const createCustomMarkerIcon = (type = 'provider', isVerified = false, isSelected = false) => {
  let bgColor = isVerified ? '#059669' : '#2563eb'; // Emerald if verified, Blue default
  let ringColor = isSelected ? '#f59e0b' : '#ffffff'; // Amber halo if selected

  if (type === 'user') {
    return L.divIcon({
      className: 'fixit-user-marker',
      html: `
        <div style="
          position: relative;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(37, 99, 235, 0.3);
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #2563eb;
            border: 3px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }

  if (type === 'pin') {
    // Draggable / interactive placement pin
    return L.divIcon({
      className: 'fixit-pin-marker',
      html: `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: #ef4444;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          border: 2px solid #ffffff;
        ">
          <div style="
            transform: rotate(45deg);
            color: #ffffff;
            font-size: 14px;
            font-weight: bold;
          ">📍</div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  }

  // Provider pin
  return L.divIcon({
    className: 'fixit-provider-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${isSelected ? '38px' : '32px'};
        height: ${isSelected ? '38px' : '32px'};
        background: ${bgColor};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        border: 2.5px solid ${ringColor};
        transition: transform 0.2s ease;
      ">
        <div style="
          transform: rotate(45deg);
          color: #ffffff;
          font-size: ${isSelected ? '16px' : '14px'};
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        ">🔧</div>
      </div>
    `,
    iconSize: isSelected ? [38, 38] : [32, 32],
    iconAnchor: isSelected ? [19, 38] : [16, 32],
    popupAnchor: [0, isSelected ? -38 : -32],
  });
};

// Component to dynamically update map viewport on center or zoom change
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

// Component to handle map clicks in interactive mode
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect({
          latitude: Number(e.latlng.lat.toFixed(6)),
          longitude: Number(e.latlng.lng.toFixed(6)),
        });
      }
    },
  });
  return null;
};

const ProviderMap = ({
  center = [12.9716, 77.5946], // Default center Bangalore
  zoom = 13,
  providers = [],
  userLocation = null,
  searchRadius = null, // in km
  selectedProviderId = null,
  onProviderSelect = null,
  interactive = false,
  selectedLocation = null,
  onLocationSelect = null,
  height = '460px',
  className = '',
}) => {
  // Safe center validation
  const safeCenter =
    Array.isArray(center) &&
    center.length === 2 &&
    !isNaN(Number(center[0])) &&
    !isNaN(Number(center[1])) &&
    Number(center[0]) !== 0
      ? [Number(center[0]), Number(center[1])]
      : [12.9716, 77.5946];

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={safeCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <MapUpdater center={safeCenter} zoom={zoom} />

        {/* Map Click Listener */}
        {interactive && <MapClickHandler onLocationSelect={onLocationSelect} />}

        {/* OpenStreetMap Tile Layer (Free, no paid API keys required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* User Search Radius Circle */}
        {userLocation && searchRadius && (
          <Circle
            center={[userLocation.latitude || userLocation[0], userLocation.longitude || userLocation[1]]}
            radius={Number(searchRadius) * 1000}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '4, 6',
            }}
          />
        )}

        {/* User Current Location Marker */}
        {userLocation && (
          <Marker
            position={[
              userLocation.latitude !== undefined ? userLocation.latitude : userLocation[0],
              userLocation.longitude !== undefined ? userLocation.longitude : userLocation[1],
            ]}
            icon={createCustomMarkerIcon('user')}
          >
            <Popup>
              <div className="p-1 text-center font-sans">
                <p className="text-xs font-bold text-blue-600 flex items-center justify-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" /> Your Location
                </p>
                {searchRadius && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Searching within {searchRadius} km
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Interactive Placement Marker (for provider location setup) */}
        {selectedLocation && (
          <Marker
            position={[
              selectedLocation.latitude !== undefined ? selectedLocation.latitude : selectedLocation[0],
              selectedLocation.longitude !== undefined ? selectedLocation.longitude : selectedLocation[1],
            ]}
            icon={createCustomMarkerIcon('pin')}
          >
            <Popup>
              <div className="p-1 text-center font-sans">
                <p className="text-xs font-bold text-rose-600">Selected Location</p>
                <p className="text-[11px] text-slate-500">
                  {selectedLocation.latitude?.toFixed(4)}, {selectedLocation.longitude?.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Provider Markers */}
        {providers.map((p) => {
          const coords = p.location?.coordinates;
          // Coordinates must be [longitude, latitude] in GeoJSON
          if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
          const lng = Number(coords[0]);
          const lat = Number(coords[1]);

          // Exclude unset default [0, 0] markers
          if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;

          const isSelected = selectedProviderId && String(p._id) === String(selectedProviderId);
          const isVerified = Boolean(p.isVerified);

          return (
            <Marker
              key={p._id}
              position={[lat, lng]}
              icon={createCustomMarkerIcon('provider', isVerified, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onProviderSelect) onProviderSelect(p);
                },
              }}
            >
              <Popup className="fixit-provider-popup">
                <div className="p-2 w-56 font-sans">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {p.businessName || 'Service Provider'}
                    </h4>
                    {isVerified && (
                      <span title="Verified Provider" className="text-emerald-600 flex-shrink-0">
                        <ShieldCheck className="w-4 h-4 fill-emerald-100" />
                      </span>
                    )}
                  </div>

                  {/* Rating & Distance */}
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
                      {p.rating ? p.rating.toFixed(1) : 'New'}
                    </span>
                    {p.distance !== undefined && (
                      <span className="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {p.distance} km away
                      </span>
                    )}
                  </div>

                  {/* Services tags */}
                  {p.services && p.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.services.slice(0, 2).map((s, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-medium"
                        >
                          {s.name || s.category || 'Service'}
                        </span>
                      ))}
                      {p.services.length > 2 && (
                        <span className="text-[10px] text-slate-400">
                          +{p.services.length - 2} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pricing info */}
                  {p.pricing?.startingPrice > 0 && (
                    <p className="text-xs text-slate-500 mb-2">
                      Starts from <span className="font-bold text-slate-800">₹{p.pricing.startingPrice}</span>
                    </p>
                  )}

                  {/* Action Link */}
                  <Link
                    to={`/providers/${p._id}`}
                    className="w-full flex items-center justify-center gap-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating map hint */}
      {interactive && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 shadow-md flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span>Click anywhere on the map to place your service pin</span>
        </div>
      )}
    </div>
  );
};

export default ProviderMap;
