import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, LoadingState, ErrorState } from '../components/ui/Components';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/services');
        setServices(res.data.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load services');
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (loading) return <LoadingState text="Loading services..." />;
  if (error) return <div className="p-8"><ErrorState message={error} /></div>;

  return (
    <div className="min-h-screen bg-neutral-bg p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-dark mb-2">Our Services</h1>
        <p className="text-neutral-muted mb-8">Select a service to find professional providers near you.</p>
        
        {services.length === 0 ? (
          <p className="text-neutral-muted">No services available at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {services.map(service => (
              <div 
                key={service._id} 
                onClick={() => navigate(`/providers?service=${service._id}`)}
                className="cursor-pointer transition-transform hover:-translate-y-1"
              >
                <Card className="h-full flex flex-col hover:border-primary/30">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mr-4">
                      {service.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-dark">{service.name}</h2>
                      <p className="text-xs text-primary font-medium">{service.category}</p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-muted flex-grow">{service.description}</p>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;
