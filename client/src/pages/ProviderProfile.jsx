import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, LoadingState, ErrorState, Button, Badge } from '../components/ui/Components';
import { AuthContext } from '../context/AuthContext';
import ProviderMap from '../components/maps/ProviderMap';
import LocationManager from '../components/maps/LocationManager';

const ProviderProfile = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [providerRes, reviewsRes] = await Promise.all([
          api.get(`/providers/${id}`),
          api.get(`/reviews/provider/${id}`)
        ]);
        setProvider(providerRes.data.data);
        setReviews(reviewsRes.data.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load provider profile');
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <LoadingState text="Loading profile..." />;
  if (error) return <div className="p-8 max-w-6xl mx-auto"><ErrorState message={error} /></div>;
  if (!provider) return null;

  const isOwner = user && provider.user && user._id === provider.user._id;
  const hasLocation = provider.location?.coordinates && (provider.location.coordinates[0] !== 0 || provider.location.coordinates[1] !== 0);

  return (
    <div className="min-h-screen bg-neutral-bg p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="text-primary hover:text-primary-hover mb-6 font-medium text-sm flex items-center"
        >
          ← Back to search
        </button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="h-full">
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
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

              {isOwner && (
                <LocationManager 
                  initialLat={hasLocation ? provider.location.coordinates[1] : ''}
                  initialLng={hasLocation ? provider.location.coordinates[0] : ''}
                  initialRadius={provider.serviceRadius}
                  onUpdate={(updatedProvider) => setProvider(updatedProvider)}
                />
              )}
            </Card>
          </div>
          
          <div className="lg:col-span-1 h-[400px] lg:h-auto">
            <Card className="h-full p-0 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border-subtle bg-surface-white">
                <h3 className="font-bold text-neutral-dark">Service Location</h3>
                {provider.serviceRadius && (
                  <p className="text-xs text-neutral-muted mt-1">Serves up to {provider.serviceRadius} km</p>
                )}
              </div>
              <div className="flex-grow z-0 relative">
                <ProviderMap 
                  providers={[provider]} 
                  showRadius={true}
                />
              </div>
            </Card>
          </div>
        </div>

        {reviews.length > 0 && (
          <Card>
            <h3 className="text-xl font-bold text-neutral-dark mb-6">Recent Reviews</h3>
            <div className="space-y-6">
              {reviews.map(review => (
                <div key={review._id} className="border-b border-border-subtle last:border-0 pb-6 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-neutral-dark">{review.customer?.name || 'Customer'}</p>
                      <p className="text-xs text-neutral-muted">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="primary">★ {review.rating}</Badge>
                  </div>
                  <p className="text-neutral-dark mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProviderProfile;
