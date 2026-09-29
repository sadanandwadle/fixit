import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Card, LoadingState, ErrorState, Button, Badge, Input } from '../components/ui/Components';

const getStatusBadge = (status) => {
  switch (status) {
    case 'pending': return <Badge variant="default">Pending</Badge>;
    case 'accepted': return <Badge variant="primary">Accepted</Badge>;
    case 'confirmed': return <Badge variant="success">Confirmed</Badge>;
    case 'in-progress': return <Badge variant="warning">In Progress</Badge>;
    case 'completed': return <Badge variant="success">Completed</Badge>;
    case 'rejected': return <Badge variant="danger">Rejected</Badge>;
    case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

const BookingDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [otpGenerated, setOtpGenerated] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const navigate = useNavigate();

  const fetchBooking = async () => {
    try {
      const res = await api.get(`/bookings/${id}`);
      setBooking(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/bookings/${id}/${action}`);
      if (action === 'confirm' && res.data.otp) {
        setOtpGenerated(res.data.otp);
      }
      await fetchBooking();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} booking`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.length !== 6) {
      alert("Please enter a valid 6-digit OTP");
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/bookings/${id}/verify-otp`, { otp: otpInput });
      await fetchBooking();
      setOtpInput('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    setActionLoading(true);
    try {
      await api.post('/reviews', { bookingId: id, rating, comment });
      await fetchBooking();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState text="Loading booking..." />;
  if (error) return <div className="p-8"><ErrorState message={error} /></div>;
  if (!booking) return null;

  const isCustomer = user?.role === 'customer';
  const isProvider = user?.role === 'provider';

  return (
    <div className="min-h-screen bg-neutral-bg p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/bookings')} className="text-primary hover:text-primary-hover mb-6 font-medium text-sm flex items-center">
          ← Back to bookings
        </button>
        
        {otpGenerated && (
          <div className="mb-6 p-4 bg-status-success/10 border border-status-success rounded-md">
            <h3 className="text-status-success font-bold text-lg mb-2">Booking Confirmed!</h3>
            <p className="text-neutral-dark mb-2">Please share this 6-digit OTP with the provider when they arrive to start the service:</p>
            <div className="text-3xl font-mono tracking-widest text-neutral-dark font-bold py-2">{otpGenerated}</div>
            <p className="text-sm text-neutral-muted mt-2">This code is valid for 24 hours. Do not share it until the provider arrives.</p>
          </div>
        )}

        <Card>
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-border-subtle">
            <div>
              <h1 className="text-2xl font-bold text-neutral-dark mb-2">Booking Details</h1>
              <p className="text-neutral-muted text-sm">ID: {booking._id}</p>
            </div>
            <div>
              {getStatusBadge(booking.status)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-neutral-muted uppercase tracking-wider mb-2">Service Information</h3>
              <p className="font-medium text-neutral-dark mb-1">{booking.service?.name}</p>
              <p className="text-sm text-neutral-muted">{booking.service?.category}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-neutral-muted uppercase tracking-wider mb-2">Schedule</h3>
              <p className="font-medium text-neutral-dark mb-1">{new Date(booking.scheduledDate).toLocaleDateString()}</p>
              <p className="text-sm text-neutral-muted">{booking.scheduledTime}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-neutral-muted uppercase tracking-wider mb-2">
                {isCustomer ? 'Provider' : 'Customer'}
              </h3>
              <p className="font-medium text-neutral-dark mb-1">
                {isCustomer ? booking.provider?.professionalName : booking.customer?.name}
              </p>
            </div>
          </div>
          
          {booking.notes && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-neutral-muted uppercase tracking-wider mb-2">Additional Notes</h3>
              <div className="bg-surface-dim p-4 rounded-md border border-border-subtle">
                <p className="text-neutral-dark text-sm whitespace-pre-wrap">{booking.notes}</p>
              </div>
            </div>
          )}

          {isProvider && booking.status === 'confirmed' && (
            <div className="mb-8 p-4 bg-surface-dim rounded-md border border-border-subtle">
              <h3 className="text-md font-bold text-neutral-dark mb-2">Verify Service Start</h3>
              <p className="text-sm text-neutral-muted mb-4">Ask the customer for their 6-digit OTP to officially begin the service.</p>
              <div className="flex gap-2 max-w-sm">
                <Input 
                  type="text" 
                  placeholder="123456" 
                  value={otpInput} 
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono tracking-widest text-center"
                />
                <Button onClick={handleVerifyOtp} disabled={actionLoading || otpInput.length !== 6}>
                  Verify OTP
                </Button>
              </div>
            </div>
          )}

          {booking.status === 'completed' && isCustomer && (
            <div className="mb-8 space-y-6">
              {!booking.isPaid ? (
                <div className="p-6 bg-surface-dim rounded-md border border-border-subtle">
                  <h3 className="text-lg font-bold text-neutral-dark mb-2">Service Completed</h3>
                  <p className="text-sm text-neutral-muted mb-4">Please complete the payment for your service. This is a demo payment.</p>
                  <Button 
                    onClick={() => handleAction('pay')} 
                    disabled={actionLoading}
                    className="w-full sm:w-auto"
                  >
                    Pay $50.00 (Demo)
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-status-success/10 border border-status-success rounded-md">
                  <h3 className="text-status-success font-bold text-lg mb-1">Payment Successful ✓</h3>
                  <p className="text-sm text-neutral-dark">Thank you for your demo payment.</p>
                </div>
              )}

              {booking.isPaid && !booking.review && (
                <div className="p-6 bg-surface-dim rounded-md border border-border-subtle">
                  <h3 className="text-lg font-bold text-neutral-dark mb-4">Leave a Review</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-dark mb-2">Rating (1-5)</label>
                      <select 
                        className="w-full sm:w-auto p-2 border border-border-subtle rounded-md bg-neutral-bg focus:outline-none focus:ring-2 focus:ring-primary"
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                      >
                        <option value={5}>5 - Excellent</option>
                        <option value={4}>4 - Very Good</option>
                        <option value={3}>3 - Average</option>
                        <option value={2}>2 - Poor</option>
                        <option value={1}>1 - Terrible</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-dark mb-2">Comment</label>
                      <textarea 
                        className="w-full p-3 border border-border-subtle rounded-md bg-neutral-bg focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
                        placeholder="Share your experience..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSubmitReview} disabled={actionLoading}>
                      Submit Review
                    </Button>
                  </div>
                </div>
              )}

              {booking.review && (
                <div className="p-6 bg-surface-dim rounded-md border border-border-subtle">
                  <div className="flex justify-between mb-2">
                    <h3 className="text-lg font-bold text-neutral-dark">Your Review</h3>
                    <Badge variant="primary">★ {booking.review.rating}</Badge>
                  </div>
                  <p className="text-neutral-dark">{booking.review.comment}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="pt-6 border-t border-border-subtle flex flex-wrap gap-3 justify-end">
            {isProvider && booking.status === 'pending' && (
              <>
                <Button variant="danger" onClick={() => handleAction('reject')} disabled={actionLoading}>Reject</Button>
                <Button variant="success" onClick={() => handleAction('accept')} disabled={actionLoading}>Accept</Button>
              </>
            )}
            
            {isCustomer && booking.status === 'accepted' && (
              <Button variant="success" onClick={() => handleAction('confirm')} disabled={actionLoading}>Confirm Booking</Button>
            )}
            
            {isProvider && booking.status === 'in-progress' && (
              <Button variant="success" onClick={() => handleAction('complete')} disabled={actionLoading}>Complete Service</Button>
            )}

            {isCustomer && ['pending', 'accepted', 'confirmed'].includes(booking.status) && (
              <Button variant="secondary" onClick={() => handleAction('cancel')} disabled={actionLoading}>Cancel Booking</Button>
            )}
            
            {isProvider && ['accepted', 'confirmed'].includes(booking.status) && (
              <Button variant="secondary" onClick={() => handleAction('cancel')} disabled={actionLoading}>Cancel Booking</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BookingDetail;
