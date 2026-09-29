import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, LoadingState, ErrorState, Button, Badge } from '../components/ui/Components';

const ProviderProfile = () => {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await api.get(`/providers/${id}`);
        setProvider(res.data.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load provider profile');
        setLoading(false);
      }
    };
    fetchProvider();
  }, [id]);

  if (loading) return <LoadingState text="Loading profile..." />;
  if (error) return <div className="p-8 max-w-4xl mx-auto"><ErrorState message={error} /></div>;
  if (!provider) return null;

  return (
    <div className="min-h-screen bg-neutral-bg p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="text-primary hover:text-primary-hover mb-6 font-medium text-sm flex items-center"
        >
          ← Back to search
        </button>
        
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-dark mb-1">{provider.professionalName}</h1>
              <p className="text-neutral-muted text-lg">{provider.user?.name}</p>
            </div>
            <div>
              {provider.verified && <Badge variant="success" className="mb-2 md:mb-0 md:mr-2">Verified Professional</Badge>}
              <Badge variant="primary">★ {provider.rating} ({provider.reviewCount} reviews)</Badge>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-neutral-dark mb-2">About</h3>
            <p className="text-neutral-dark leading-relaxed">{provider.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-neutral-muted uppercase tracking-wider mb-3">Services Offered</h3>
              <div className="flex flex-col gap-2">
                {provider.services?.map(s => (
                  <div key={s._id} className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-primary mr-2"></span>
                    <span className="text-neutral-dark">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-muted uppercase tracking-wider mb-1">Base Pricing</h3>
                <p className="text-neutral-dark font-medium">{provider.pricing}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-muted uppercase tracking-wider mb-1">Experience</h3>
                <p className="text-neutral-dark">{provider.experience}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-muted uppercase tracking-wider mb-1">Availability</h3>
                <p className="text-neutral-dark">{provider.availability}</p>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-border-subtle flex justify-end">
            <Button onClick={() => navigate(`/book/${provider._id}${provider.services?.length > 0 ? `?serviceId=${provider.services[0]._id}` : ''}`)} className="w-full sm:w-auto px-8">
              Book Appointment
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProviderProfile;
