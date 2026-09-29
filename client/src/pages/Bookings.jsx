import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Card, LoadingState, ErrorState, Button, Badge } from '../components/ui/Components';

const getStatusBadge = (status) => {
  switch (status) {
    case 'pending': return <Badge variant="default">Pending</Badge>;
    case 'accepted': return <Badge variant="primary">Accepted</Badge>;
    case 'confirmed': return <Badge variant="success">Confirmed</Badge>;
    case 'rejected': return <Badge variant="danger">Rejected</Badge>;
    case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

const Bookings = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get('/bookings');
        setBookings(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) return <LoadingState text="Loading bookings..." />;
  if (error) return <div className="p-8"><ErrorState message={error} /></div>;

  return (
    <div className="min-h-screen bg-neutral-bg p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-dark mb-8">My Bookings</h1>
        
        {bookings.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-neutral-muted mb-4">You have no bookings yet.</p>
            {user?.role === 'customer' && (
              <Button onClick={() => navigate('/services')} className="mx-auto block">Find a Service</Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <Card key={booking._id} className="flex flex-col sm:flex-row justify-between sm:items-center hover:border-primary/30 transition-colors">
                <div className="mb-4 sm:mb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-neutral-dark">
                      {booking.service?.name}
                    </h3>
                    {getStatusBadge(booking.status)}
                  </div>
                  <p className="text-sm text-neutral-muted mb-1">
                    {user?.role === 'customer' ? `Provider: ${booking.provider?.professionalName}` : `Customer: ${booking.customer?.name}`}
                  </p>
                  <p className="text-sm text-neutral-dark">
                    {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
                  </p>
                </div>
                <div>
                  <Button onClick={() => navigate(`/bookings/${booking._id}`)} variant="secondary">
                    View Details
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

export default Bookings;
