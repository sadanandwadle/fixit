import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, LoadingState, ErrorState, Input, Button, Badge } from '../components/ui/Components';

const Providers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const serviceId = searchParams.get('service');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        let url = '/providers?';
        if (serviceId) url += `service=${serviceId}&`;
        if (searchParams.get('search')) url += `search=${searchParams.get('search')}`;
        
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
  }, [serviceId, searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (serviceId) params.append('service', serviceId);
    if (searchQuery) params.append('search', searchQuery);
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-neutral-bg p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-dark mb-2">Find a Provider</h1>
        <p className="text-neutral-muted mb-8">Discover top-rated professionals for your needs.</p>
        
        <form onSubmit={handleSearch} className="mb-8 flex gap-4 max-w-2xl">
          <div className="flex-grow">
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
              className="!mb-0"
            />
          </div>
          <div className="w-32">
            <Button type="submit">Search</Button>
          </div>
        </form>
        
        {loading ? (
          <LoadingState text="Loading providers..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : providers.length === 0 ? (
          <div className="text-center py-12 bg-surface-white rounded-lg border border-border-subtle">
            <p className="text-neutral-muted text-lg mb-4">No providers found matching your criteria.</p>
            <Button onClick={() => navigate('/services')} variant="secondary" className="w-auto px-6">
              Browse All Services
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map(provider => (
              <Card key={provider._id} className="flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-dark">{provider.professionalName}</h2>
                    <p className="text-sm text-neutral-muted">{provider.user?.name}</p>
                  </div>
                  {provider.verified && <Badge variant="success">Verified</Badge>}
                </div>
                
                <p className="text-sm text-neutral-dark mb-4 line-clamp-2">{provider.description}</p>
                
                <div className="mb-4">
                  <p className="text-xs text-neutral-muted font-medium mb-1">SERVICES</p>
                  <div className="flex flex-wrap gap-2">
                    {provider.services?.map(s => (
                      <Badge key={s._id} variant="default">{s.name}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-auto pt-4 border-t border-border-subtle">
                  <div>
                    <p className="text-xs text-neutral-muted">Pricing</p>
                    <p className="text-sm font-semibold text-neutral-dark">{provider.pricing}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-muted">Rating</p>
                    <p className="text-sm font-semibold text-neutral-dark">★ {provider.rating} ({provider.reviewCount})</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-2">
                  <Button onClick={() => navigate(`/providers/${provider._id}`)}>
                    View Profile
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Providers;
