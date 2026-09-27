import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookingAPI, reviewAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  Calendar,
  Clock,
  MapPin,
  Wrench,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Phone,
  Mail,
  FileText,
  KeyRound,
  CheckCheck,
  Star,
  CheckCircle,
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

const LIFECYCLE_STEPS = [
  { key: 'pending', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in-progress', label: 'In-Progress' },
  { key: 'completed', label: 'Completed' },
];

const ProviderBookingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // OTP state
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState(null);

  // Review state
  const [review, setReview] = useState(null);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingAPI.getById(id);
      if (res.data?.success) {
        setBooking(res.data.data);

        if (res.data.data.status === 'completed') {
          try {
            const revRes = await reviewAPI.getByBooking(id);
            if (revRes.data?.success && revRes.data.data) {
              setReview(revRes.data.data);
            }
          } catch {
            // No review yet
          }
        }
      }
    } catch (err) {
      console.error('Failed to load booking:', err);
      setError(err.response?.data?.message || 'Could not load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await bookingAPI.accept(id);
      if (res.data?.success) {
        setSuccess('Booking accepted! Customer has been notified.');
        fetchBooking();
      } else {
        setError(res.data?.message || 'Failed to accept booking');
      }
    } catch (err) {
      console.error('Accept booking error:', err);
      setError(err.response?.data?.message || 'Failed to accept booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await bookingAPI.reject(id, 'Schedule conflict');
      if (res.data?.success) {
        setSuccess('Booking rejected.');
        fetchBooking();
      } else {
        setError(res.data?.message || 'Failed to reject booking');
      }
    } catch (err) {
      console.error('Reject booking error:', err);
      setError(err.response?.data?.message || 'Failed to reject booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!enteredOtp || enteredOtp.trim().length !== 4) {
      setOtpError('Please enter a valid 4-digit code provided by customer');
      return;
    }

    try {
      setActionLoading(true);
      setOtpError(null);
      const res = await bookingAPI.verifyOtp(id, enteredOtp.trim());
      if (res.data?.success) {
        setSuccess('OTP verified successfully! Service is now In-Progress.');
        setEnteredOtp('');
        fetchBooking();
      } else {
        setOtpError(res.data?.message || 'Failed to verify OTP');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setOtpError(err.response?.data?.message || 'Invalid OTP code. Please verify with the customer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await bookingAPI.complete(id);
      if (res.data?.success) {
        setSuccess('Service successfully completed!');
        fetchBooking();
      } else {
        setError(res.data?.message || 'Failed to complete service');
      }
    } catch (err) {
      console.error('Complete service error:', err);
      setError(err.response?.data?.message || 'Failed to complete service');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading booking details..." />;
  }

  if (error && !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <Alert type="error" message={error} />
        <Link
          to="/provider/bookings"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
        >
          Back to Bookings
        </Link>
      </div>
    );
  }

  const badgeClass =
    statusBadgeStyles[booking.status] || 'bg-slate-100 text-slate-700 border-slate-200';
  const formattedScheduledDate = new Date(booking.scheduledDate).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const customerObj = booking.customerId || {};
  const isTerminal = ['cancelled', 'rejected'].includes(booking.status);
  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === booking.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/provider/bookings"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Bookings</span>
        </Link>

        <span className="text-xs text-slate-400 font-mono">
          REF: {booking._id.slice(-8).toUpperCase()}
        </span>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Main Status Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
            <Wrench className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Job Assignment
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              {booking.serviceId?.name || 'Service Job'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Category: {booking.serviceId?.category || 'Standard'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          <span
            className={`text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full border self-start sm:self-auto ${badgeClass}`}
          >
            {booking.status}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900">Fee: ₹{booking.price}</span>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                booking.paymentStatus === 'paid'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : booking.paymentStatus === 'processing'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : booking.paymentStatus === 'failed'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : booking.paymentStatus === 'cancelled'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              Payment: {
                booking.paymentStatus === 'paid'
                  ? 'Paid'
                  : booking.paymentStatus === 'processing'
                  ? 'Processing'
                  : booking.paymentStatus === 'failed'
                  ? 'Failed'
                  : booking.paymentStatus === 'cancelled'
                  ? 'Cancelled'
                  : 'Payment Pending'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Visual Service Progress Tracker */}
      {!isTerminal && (
        <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Lifecycle Status
          </h2>

          <div className="grid grid-cols-5 gap-1 sm:gap-2 relative">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.key} className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                  <div
                    className={`w-7 h-7 min-[400px]:w-9 min-[400px]:h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[10px] min-[400px]:text-xs font-black transition-all ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 sm:ring-4 ring-blue-100'
                        : isPast
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[9px] min-[400px]:text-[11px] sm:text-xs font-bold leading-tight px-0.5 break-words ${
                      isCurrent
                        ? 'text-blue-700 font-black'
                        : isPast
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Box: Pending -> Accept / Reject */}
      {booking.status === 'pending' && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-extrabold text-amber-900 text-base">New Job Request</h3>
            <p className="text-xs text-amber-700">
              Please accept or reject this client service request.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Accept Job</span>
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="flex-1 sm:flex-none px-6 py-3 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Box: Confirmed -> Enter OTP */}
      {booking.status === 'confirmed' && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-900 text-base">Client Confirmed & OTP Generated</h3>
              <p className="text-xs text-blue-700">
                Ask the customer for their 4-digit Service OTP upon arriving at their address.
              </p>
            </div>
          </div>

          {otpError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
              {otpError}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <input
              type="text"
              maxLength={4}
              required
              pattern="[0-9]{4}"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit OTP"
              className="w-full sm:w-64 text-center text-lg font-mono font-bold tracking-widest py-2.5 px-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={actionLoading || enteredOtp.length !== 4}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-md transition"
            >
              {actionLoading ? 'Verifying...' : 'Verify OTP & Start Service'}
            </button>
          </form>
        </div>
      )}

      {/* Action Box: In-Progress -> Complete Service */}
      {booking.status === 'in-progress' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-extrabold text-indigo-900 text-base">Service In Progress</h3>
            <p className="text-xs text-indigo-700">
              OTP verified. When finished with the maintenance or repair, mark the job complete.
            </p>
          </div>

          <button
            onClick={handleComplete}
            disabled={actionLoading}
            className="w-full sm:w-auto px-7 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-500/20 transition flex items-center justify-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark Service Completed</span>
          </button>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Schedule & Location */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black text-slate-900 text-sm pb-2 border-b border-slate-100">
            Appointment Schedule
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <span className="text-slate-400 block font-medium">Scheduled Date</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {formattedScheduledDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <span className="text-slate-400 block font-medium">Time Window</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {booking.scheduledTime}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block font-medium">Customer Address</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {booking.address?.street}
                  {booking.address?.city ? `, ${booking.address.city}` : ''}
                  {booking.address?.state ? `, ${booking.address.state}` : ''}
                  {booking.address?.zipCode ? ` - ${booking.address.zipCode}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black text-slate-900 text-sm pb-2 border-b border-slate-100">
            Customer Information
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Customer Name</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                {customerObj.name || 'Verified Client'}
              </span>
            </div>

            {customerObj.phone && (
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">{customerObj.phone}</span>
              </div>
            )}

            {customerObj.email && (
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{customerObj.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Problem Notes */}
      {booking.description && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Problem Notes</span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm bg-slate-50 p-4 rounded-2xl">
            {booking.description}
          </p>
        </div>
      )}

      {/* Review details if completed */}
      {review && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-black text-slate-900 text-sm pb-2 border-b border-slate-100">
            Customer Review & Rating
          </h3>
          <div className="flex items-center gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                }`}
              />
            ))}
            <span className="text-xs font-bold text-slate-700 ml-2">
              {review.rating} / 5 Stars
            </span>
          </div>
          <p className="text-slate-700 text-xs sm:text-sm italic">"{review.comment}"</p>
        </div>
      )}
    </div>
  );
};

export default ProviderBookingDetailsPage;
