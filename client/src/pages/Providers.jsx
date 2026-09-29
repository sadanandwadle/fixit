import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, LoadingState, ErrorState, Input, Button, Badge } from '../components/ui/Components';
import ProviderMap from '../components/maps/ProviderMap';

const Providers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const serviceId = searchParams.get('service');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Location states
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        let url = '/providers?';
        if (serviceId) url += `service=${serviceId}&`;
        if (searchParams.get('search')) url += `search=${searchParams.get('search')}&`;
        if (userLocation) {
          url += `lat=${userLocation.lat}&lng=${userLocation.lng}&radius=50&`;
        }
        
        const res = await api.get(url);
        setProviders(res.data.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load providers');
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, [serviceId, searchParams, userLocation]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (serviceId) params.append('service', serviceId);
    if (searchQuery) params.append('search', searchQuery);
    setSearchParams(params);
  };

  const handleGetLocation = () => {
    setLocationError(null);
    setIsLocating(true);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      () => {
        setLocationError('Unable to retrieve your location');
        setIsLocating(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-neutral-bg p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-dark mb-2">Find a Provider</h1>
        <p className="text-neutral-muted mb-6">Discover top-rated professionals for your needs.</p>
        
        <div className="bg-surface-white p-4 rounded-lg shadow-sm border border-border-subtle mb-6 flex flex-col md:flex-row gap-4 items-end">
          <form onSubmit={handleSearch} className="flex-grow flex gap-4 w-full">
            <div className="flex-grow">
              <label className="block text-xs font-medium text-neutral-dark mb-1">Search</label>
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or description..."
                className="!mb-0"
              />
            </div>
            <div className="w-32 self-end">
              <Button type="submit" className="w-full">Search</Button>
            </div>
          </form>
          
          <div className="w-full md:w-auto border-t md:border-t-0 md:border-l border-border-subtle pt-4 md:pt-0 md:pl-4 flex flex-col justify-end">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleGetLocation}
              disabled={isLocating}
              className="whitespace-nowrap"
            >
              {isLocating ? 'Locating...' : '📍 Find Near Me'}
            </Button>
            {locationError && <p className="text-[10px] text-status-error mt-1 absolute">{locationError}</p>}
            {userLocation && !locationError && <p className="text-[10px] text-status-success mt-1 absolute">Location active</p>}
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
          <div className="w-full lg:w-1/2 flex flex-col h-full overflow-hidden">
            {loading ? (
              <LoadingState text="Loading providers..." />
            ) : error ? (
              <ErrorState message={error} />
            ) : providers.length === 0 ? (
              <div className="text-center py-12 bg-surface-white rounded-lg border border-border-subtle flex-grow">
                <p className="text-neutral-muted text-lg mb-4">No providers found matching your criteria.</p>
                <Button onClick={() => { setUserLocation(null); navigate('/services'); }} variant="secondary" className="w-auto px-6">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {providers.map(provider => (
                  <Card key={provider._id} className="flex flex-col transition-shadow hover:shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h2 className="text-lg font-bold text-neutral-dark leading-tight">{provider.professionalName}</h2>
                        <p className="text-xs text-neutral-muted">{provider.user?.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {provider.verified && <Badge variant="success">Verified</Badge>}
                        {provider.distanceMeters !== undefined && (
                          <Badge variant="primary">{(provider.distanceMeters / 1000).toFixed(1)} km</Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-neutral-dark mb-4 line-clamp-2">{provider.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {provider.services?.map(s => (
                          <span key={s._id} className="text-[10px] bg-neutral-bg text-neutral-dark px-2 py-0.5 rounded-full border border-border-subtle">{s.name}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-auto pt-3 border-t border-border-subtle">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] text-neutral-muted font-semibold uppercase">Pricing</p>
                          <p className="text-sm font-semibold text-neutral-dark">{provider.pricing}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-muted font-semibold uppercase">Rating</p>
                          <p className="text-sm font-semibold text-neutral-dark">★ {provider.rating}</p>
                        </div>
                      </div>
                      <div>
                        <Button onClick={() => navigate(`/providers/${provider._id}`)} className="text-xs px-4 py-1.5 h-auto">
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <div className="w-full lg:w-1/2 h-[400px] lg:h-full bg-surface-white p-2 rounded-lg border border-border-subtle shadow-sm z-0">
            <ProviderMap 
              providers={providers} 
              center={userLocation ? [userLocation.lat, userLocation.lng] : [0, 0]} 
              zoom={userLocation ? 11 : 2}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Providers;
