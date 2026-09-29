import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, LoadingState, ErrorState, Button, Input } from '../components/ui/Components';

const BookService = () => {
  const { providerId } = useParams();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('serviceId');
  
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    notes: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await api.get(`/providers/${providerId}`);
        setProvider(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load provider');
      } finally {
        setLoading(false);
      }
    };
    fetchProvider();
  }, [providerId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/bookings', {
        providerId,
        serviceId,
        ...formData
      });
      navigate(`/bookings/${res.data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking');
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState text="Preparing booking..." />;
  if (error) return <div className="p-8"><ErrorState message={error} /></div>;
  if (!provider) return null;

  const selectedService = provider.services?.find(s => s._id === serviceId) || provider.services?.[0];

  return (
    <div className="min-h-screen bg-neutral-bg p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-primary hover:text-primary-hover mb-6 font-medium text-sm flex items-center">
          ← Back to provider
        </button>
        
        <h1 className="text-3xl font-bold text-neutral-dark mb-6">Book Appointment</h1>
        
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-subtle">
            <div>
              <p className="text-xs text-neutral-muted uppercase tracking-wider mb-1">Provider</p>
              <h2 className="text-xl font-bold text-neutral-dark">{provider.professionalName}</h2>
            </div>
            {selectedService && (
              <div className="text-right">
                <p className="text-xs text-neutral-muted uppercase tracking-wider mb-1">Service</p>
                <p className="font-semibold text-neutral-dark">{selectedService.name}</p>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Date</label>
                <Input 
                  type="date" 
                  name="scheduledDate"
                  value={formData.scheduledDate} 
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Time</label>
                <Input 
                  type="time" 
                  name="scheduledTime"
                  value={formData.scheduledTime} 
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-dark mb-1">Additional Notes</label>
              <textarea 
                name="notes"
                className="w-full px-4 py-2 bg-surface-white border border-border-subtle rounded-md text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors min-h-[100px]"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Describe what needs to be fixed..."
              />
            </div>
            
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Confirming...' : 'Request Booking'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default BookService;
