import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { bookingAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Wrench,
  User,
  Phone,
  FileText,
  Filter,
  KeyRound,
  CheckCircle2,
  Play,
  CheckCheck,
  ArrowRight,
} from 'lucide-react';

const statusBadgeStyles = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  confirmed: 'bg-blue-50 text-blue-800 border-blue-200',
  'in-progress': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  completed: 'bg-teal-50 text-teal-800 border-teal-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ProviderBookingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // OTP verification state
  const [otpModalBookingId, setOtpModalBookingId] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingAPI.getMyProviderBookings();
      if (res.data?.success) {
        setBookings(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch provider bookings:', err);
      setError(err.response?.data?.message || 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'all') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    setSearchParams(newParams);
  };

  const handleAccept = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      setError(null);
      const res = await bookingAPI.accept(bookingId);
      if (res.data?.success) {
        setSuccess('Booking accepted! Customer has been notified to confirm.');
        fetchBookings();
      } else {
        setError(res.data?.message || 'Could not accept booking');
      }
    } catch (err) {
      console.error('Accept booking error:', err);
      setError(err.response?.data?.message || 'Failed to accept booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      setError(null);
      const res = await bookingAPI.reject(bookingId, 'Service schedule full');
      if (res.data?.success) {
        setSuccess('Booking rejected.');
        fetchBookings();
      } else {
        setError(res.data?.message || 'Could not reject booking');
      }
    } catch (err) {
      console.error('Reject booking error:', err);
      setError(err.response?.data?.message || 'Failed to reject booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenOtpModal = (bookingId) => {
    setOtpModalBookingId(bookingId);
    setEnteredOtp('');
    setOtpError(null);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!enteredOtp || enteredOtp.trim().length !== 4) {
      setOtpError('Please enter a valid 4-digit OTP provided by the customer');
      return;
    }

    try {
      setOtpSubmitting(true);
      setOtpError(null);
      const res = await bookingAPI.verifyOtp(otpModalBookingId, enteredOtp.trim());
      if (res.data?.success) {
        setSuccess('OTP verified successfully! Service is now In-Progress.');
        setOtpModalBookingId(null);
        setEnteredOtp('');
        fetchBookings();
      } else {
        setOtpError(res.data?.message || 'Failed to verify OTP');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setOtpError(err.response?.data?.message || 'Invalid OTP code. Please ask the customer to check their dashboard.');
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleCompleteService = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      setError(null);
      const res = await bookingAPI.complete(bookingId);
      if (res.data?.success) {
        setSuccess('Service successfully completed! Great job.');
        fetchBookings();
      } else {
        setError(res.data?.message || 'Failed to complete service');
      }
    } catch (err) {
      console.error('Complete service error:', err);
      setError(err.response?.data?.message || 'Failed to complete service');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    return b.status === activeTab;
  });

  const tabList = [
    { id: 'all', label: 'All', count: bookings.length },
    { id: 'pending', label: 'Pending', count: bookings.filter((b) => b.status === 'pending').length },
    { id: 'accepted', label: 'Accepted', count: bookings.filter((b) => b.status === 'accepted').length },
    { id: 'confirmed', label: 'Confirmed (OTP)', count: bookings.filter((b) => b.status === 'confirmed').length },
    { id: 'in-progress', label: 'In-Progress', count: bookings.filter((b) => b.status === 'in-progress').length },
    { id: 'completed', label: 'Completed', count: bookings.filter((b) => b.status === 'completed').length },
    { id: 'rejected', label: 'Rejected', count: bookings.filter((b) => b.status === 'rejected').length },
    { id: 'cancelled', label: 'Cancelled', count: bookings.filter((b) => b.status === 'cancelled').length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Job Management
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Provider Bookings
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Accept jobs, verify customer OTPs upon arrival, and track active services.
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {tabList.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <LoadingSpinner text="Fetching booking requests..." />
      ) : filteredBookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBookings.map((b) => {
            const cust = b.customerId || {};
            const isPending = b.status === 'pending';
            const isConfirmed = b.status === 'confirmed';
            const isInProgress = b.status === 'in-progress';
            const isActing = actionLoadingId === b._id;

            const badgeClass =
              statusBadgeStyles[b.status] || 'bg-slate-100 text-slate-700 border-slate-200';
            const formattedDate = new Date(b.scheduledDate).toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={b._id}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {b.serviceId?.name || 'Service Job'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Category: {b.serviceId?.category || 'Standard'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-slate-900 block">
                        ₹{b.price}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-block mt-1 ${badgeClass}`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer details */}
                  <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Customer:</span>
                      <span className="font-bold text-slate-800">{cust.name || 'Customer'}</span>
                    </div>

                    {cust.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Contact:</span>
                        <span className="font-medium text-slate-700">{cust.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Scheduled:</span>
                      <span className="font-bold text-blue-700">
                        {formattedDate} at {b.scheduledTime}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 flex-shrink-0">Location:</span>
                      <span className="font-medium text-slate-700 text-right">
                        {b.address?.street}, {b.address?.city}
                      </span>
                    </div>
                  </div>

                  {b.description && (
                    <div className="p-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-700">
                      <span className="font-bold block text-slate-800 mb-0.5">Problem Notes:</span>
                      {b.description}
                    </div>
                  )}
                </div>

                {/* State-specific Actions */}
                <div className="pt-2">
                  {/* Pending: Accept / Reject */}
                  {isPending && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleAccept(b._id)}
                        disabled={isActing}
                        className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{isActing ? 'Processing...' : 'Accept Job'}</span>
                      </button>

                      <button
                        onClick={() => handleReject(b._id)}
                        disabled={isActing}
                        className="flex-1 py-2.5 px-4 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Job</span>
                      </button>
                    </div>
                  )}

                  {/* Confirmed: Enter Customer OTP to Start Service */}
                  {isConfirmed && (
                    <div className="space-y-2">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-2">
                        <div className="text-xs text-blue-900 font-medium">
                          Customer confirmed! Ask customer for their 4-digit OTP upon arrival.
                        </div>
                        <button
                          onClick={() => handleOpenOtpModal(b._id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 flex-shrink-0"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Verify OTP</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* In-Progress: Mark Completed */}
                  {isInProgress && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleCompleteService(b._id)}
                        disabled={isActing}
                        className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>{isActing ? 'Completing...' : 'Complete Service'}</span>
                      </button>
                    </div>
                  )}

                  {/* Completed: Finished */}
                  {b.status === 'completed' && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="flex items-center gap-1 text-teal-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        <span>Work Completed</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          b.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : b.paymentStatus === 'processing'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : b.paymentStatus === 'failed'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : b.paymentStatus === 'cancelled'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        Payment: {
                          b.paymentStatus === 'paid'
                            ? 'Paid'
                            : b.paymentStatus === 'processing'
                            ? 'Processing'
                            : b.paymentStatus === 'failed'
                            ? 'Failed'
                            : b.paymentStatus === 'cancelled'
                            ? 'Cancelled'
                            : 'Payment Pending'
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ref: {b._id.slice(-8).toUpperCase()}
                  </span>
                  <Link
                    to={`/provider/bookings/${b._id}`}
                    className="font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3 max-w-md mx-auto">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No bookings in this tab</h3>
          <p className="text-xs text-slate-500">
            You do not have any bookings with status '{activeTab}'.
          </p>
        </div>
      )}

      {/* OTP Verification Modal */}
      {otpModalBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Verify Service OTP</h3>
                  <p className="text-xs text-slate-500">Enter customer's 4-digit code</p>
                </div>
              </div>

              <button
                onClick={() => setOtpModalBookingId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {otpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                  4-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  autoFocus
                  pattern="[0-9]{4}"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center text-3xl font-mono tracking-widest py-3 border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
                <span className="block text-[11px] text-slate-400 text-center mt-2">
                  Customer can view this code on their Booking Details page
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOtpModalBookingId(null)}
                  className="flex-1 py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={otpSubmitting || enteredOtp.length !== 4}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                >
                  {otpSubmitting ? 'Verifying...' : 'Verify & Start'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderBookingsPage;
