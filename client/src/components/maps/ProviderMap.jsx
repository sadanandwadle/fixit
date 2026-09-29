import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

// Fix for default marker icons in React Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const ProviderMap = ({ providers = [], center = [0, 0], zoom = 13, showRadius = false }) => {
  const navigate = useNavigate();

  // Filter providers that have valid coordinates
  const validProviders = providers.filter(p => 
    p.location && 
    p.location.coordinates && 
    p.location.coordinates.length === 2 &&
    (p.location.coordinates[0] !== 0 || p.location.coordinates[1] !== 0)
  );

  // If we only have one valid provider and no explicit center, center on them
  const mapCenter = (validProviders.length === 1 && center[0] === 0) 
    ? [validProviders[0].location.coordinates[1], validProviders[0].location.coordinates[0]] 
    : center;

  if (validProviders.length === 0 && center[0] === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-surface-dim rounded-lg border border-border-subtle">
        <span className="text-4xl mb-3 block text-neutral-muted">🗺️</span>
        <p className="text-neutral-muted text-sm font-medium">No map locations available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border-subtle shadow-sm z-0 relative">
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validProviders.map((provider) => (
          <React.Fragment key={provider._id}>
            <Marker position={[provider.location.coordinates[1], provider.location.coordinates[0]]}>
              <Popup className="provider-popup">
                <div className="p-1">
                  <h3 className="font-bold text-neutral-dark text-base mb-1">{provider.professionalName}</h3>
                  <div className="text-xs text-neutral-muted mb-2">
                    {provider.services?.map(s => s.name).join(', ')}
                  </div>
                  {provider.distanceMeters !== undefined && (
                    <div className="text-xs font-medium text-primary mb-2">
                      {(provider.distanceMeters / 1000).toFixed(1)} km away
                    </div>
                  )}
                  <button 
                    onClick={() => navigate(`/providers/${provider._id}`)}
                    className="w-full bg-primary text-white text-xs py-1.5 rounded hover:bg-primary-hover transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </Popup>
            </Marker>
            
            {showRadius && provider.serviceRadius && (
              <Circle
                center={[provider.location.coordinates[1], provider.location.coordinates[0]]}
                pathOptions={{ fillColor: '#2563EB', fillOpacity: 0.1, color: '#2563EB', weight: 1 }}
                radius={provider.serviceRadius * 1000} // meters
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default ProviderMap;
