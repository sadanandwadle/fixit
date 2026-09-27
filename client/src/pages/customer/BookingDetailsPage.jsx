import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookingAPI, reviewAPI, paymentAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  Calendar,
  Clock,
  MapPin,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Phone,
  Mail,
  FileText,
  KeyRound,
  Star,
  ShieldCheck,
  Send,
  CreditCard,
  Receipt,
  DollarSign,
  RefreshCw,
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

const CANONICAL_PAYMENT_STATUS_LABELS = {
  pending: 'Payment Pending',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const CANONICAL_PAYMENT_METHOD_LABELS = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
};

const BookingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Review states
  const [existingReview, setExistingReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Payment states (Phase 4A)
  const [paymentInfo, setPaymentInfo] = useState(null);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingAPI.getById(id);
      if (res.data?.success) {
        setBooking(res.data.data);

        // If completed, check for existing review and payment status
        if (res.data.data.status === 'completed') {
          try {
            const [revRes, payRes] = await Promise.all([
              reviewAPI.getByBooking(id).catch(() => ({ data: { success: false } })),
              paymentAPI.getByBooking(id).catch(() => ({ data: { success: false } })),
            ]);

            if (revRes.data?.success && revRes.data.data) {
              setExistingReview(revRes.data.data);
            }
            if (payRes.data?.success && payRes.data.payment) {
              setPaymentInfo(payRes.data.payment);
            }
          } catch {
            // Silently handle
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

  const handleConfirmBooking = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await bookingAPI.confirm(id);
      if (res.data?.success) {
        setSuccess('Booking confirmed! Your service OTP has been generated.');
        fetchBooking();
      } else {
        setError(res.data?.message || 'Failed to confirm booking');
      }
    } catch (err) {
      console.error('Confirm booking error:', err);
      setError(err.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await bookingAPI.cancel(id);
      if (res.data?.success) {
        setSuccess('Booking has been cancelled.');
        setShowCancelConfirm(false);
        fetchBooking();
      } else {
        setError(res.data?.message || 'Could not cancel booking');
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please write a brief comment describing your experience');
      return;
    }

    try {
      setSubmittingReview(true);
      setError(null);
      const res = await reviewAPI.create({
        bookingId: id,
        rating,
        comment: comment.trim(),
      });

      if (res.data?.success) {
        setSuccess('Thank you! Your review and rating have been posted.');
        setExistingReview(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Review submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading booking record..." />;
  }

  if (error && !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <Alert type="error" message={error} />
        <Link
          to="/customer/bookings"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
        >
          Back to My Bookings
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
  const formattedCreatedDate = new Date(booking.createdAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const canCancel = ['pending', 'accepted'].includes(booking.status);
  const providerObj = booking.providerId || {};
  const providerUser = providerObj.userId || {};

  // Lifecycle progress computation
  const isTerminal = ['cancelled', 'rejected'].includes(booking.status);
  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === booking.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/customer/bookings"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Bookings</span>
        </Link>

        <span className="text-xs text-slate-400 font-mono">
          ID: {booking._id}
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
              Booked Service
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              {booking.serviceId?.name || 'General Service'}
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
          <span className="text-xs text-slate-400">Created {formattedCreatedDate}</span>
        </div>
      </div>

      {/* Visual Service Lifecycle Tracker */}
      {!isTerminal && (
        <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Service Progress
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

      {/* Customer Action: Confirm Booking (when Accepted) */}
      {booking.status === 'accepted' && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Provider Accepted Your Booking!</span>
            </div>
            <p className="text-xs text-emerald-700">
              Please confirm this booking to generate your secure 4-digit Service Verification OTP.
            </p>
          </div>

          <button
            onClick={handleConfirmBooking}
            disabled={actionLoading}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{actionLoading ? 'Confirming...' : 'Confirm & Generate OTP'}</span>
          </button>
        </div>
      )}

      {/* Customer Action: Display 4-digit OTP (when Confirmed) */}
      {booking.status === 'confirmed' && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
                Service Verification Code
              </span>
              <h3 className="text-lg font-black text-white">Your Service OTP</h3>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-amber-300">
                {booking.otp || '••••'}
              </span>
              <p className="text-xs text-blue-100 mt-2 max-w-md">
                Share this 4-digit OTP with your service professional <strong>only when they arrive at your location</strong> to initiate the work.
              </p>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-xs font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Protected by FixIt OTP</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* In-Progress Notification Banner */}
      {booking.status === 'in-progress' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse flex-shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-indigo-900">Service In Progress</h3>
            <p className="text-xs text-indigo-700 mt-0.5">
              The service technician has verified the OTP and is currently performing the requested service.
            </p>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scheduled Info & Address */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
            Schedule & Location
          </h2>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block font-medium">Scheduled Date</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {formattedScheduledDate}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block font-medium">Preferred Time Window</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {booking.scheduledTime}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block font-medium">Service Destination Address</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {booking.address?.street}
                  {booking.address?.city ? `, ${booking.address.city}` : ''}
                  {booking.address?.state ? `, ${booking.address.state}` : ''}
                  {booking.address?.postalCode || booking.address?.zipCode ? ` - ${booking.address.postalCode || booking.address.zipCode}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Details & Pricing */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
            Assigned Provider & Fee
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Trade Business</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                {providerObj.businessName || 'Local Pro'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-slate-600">
              {providerUser.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{providerUser.phone}</span>
                </div>
              )}
              {providerUser.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{providerUser.email}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block font-medium">Total Service Fee</span>
                <span className="text-xs text-slate-500">
                  Payment Status: {CANONICAL_PAYMENT_STATUS_LABELS[booking.paymentStatus] || 'Payment Pending'}
                </span>
              </div>
              <span className="text-2xl font-black text-slate-900">₹{booking.price}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Notes */}
      {booking.description && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Problem Description Provided</span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl">
            {booking.description}
          </p>
        </div>
      )}

      {/* Completed Section: Payment Lifecycle & Receipt (Section 17) */}
      {booking.status === 'completed' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                Service Payment
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Billing & Payment Status
              </h2>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              Demo Payment
            </span>
          </div>

          {/* Paid State */}
          {(booking.paymentStatus === 'paid' || paymentInfo?.status === 'paid') ? (
            <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Booking Status:</span>
                      <span className="text-xs font-black text-teal-700 uppercase">Completed</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-slate-500">Payment Status:</span>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Paid
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/payment/${booking._id}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
                >
                  <Receipt className="w-4 h-4" />
                  <span>View Receipt</span>
                </Link>
              </div>

              {/* Payment Details breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-200/60 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Payment Method</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {CANONICAL_PAYMENT_METHOD_LABELS[paymentInfo?.method] || 'UPI'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Transaction ID</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block break-all">
                    {paymentInfo?.transactionId || 'FIXIT-TXN-COMPLETED'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Amount Paid</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    ₹{paymentInfo?.amount || booking.price}
                  </span>
                </div>
              </div>
            </div>
          ) : (booking.paymentStatus === 'processing' || paymentInfo?.status === 'processing') ? (
            /* Processing State */
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center animate-spin">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Booking Status:</span>
                  <span className="text-xs font-black text-teal-700 uppercase">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Payment Status:</span>
                  <span className="text-xs font-bold text-indigo-900">Processing...</span>
                </div>
                <p className="text-xs text-indigo-700">
                  Simulating payment settlement of ₹{booking.price}...
                </p>
              </div>
            </div>
          ) : (booking.paymentStatus === 'failed' || paymentInfo?.status === 'failed') ? (
            /* Failed State */
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Booking Status:</span>
                    <span className="text-xs font-black text-teal-700 uppercase">Completed</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-500">Payment Status:</span>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      Failed
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 mt-1">
                    {paymentInfo?.failureReason || 'Simulated authorization declined. No money was charged.'}
                  </p>
                  <span className="text-sm font-black text-slate-900 mt-1 block">
                    Amount Due: ₹{booking.price}
                  </span>
                </div>
              </div>

              <Link
                to={`/payment/${booking._id}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </Link>
            </div>
          ) : (booking.paymentStatus === 'cancelled' || paymentInfo?.status === 'cancelled') ? (
            /* Cancelled State */
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Booking Status:</span>
                    <span className="text-xs font-black text-teal-700 uppercase">Completed</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-500">Payment Status:</span>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                      Cancelled
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Previous payment attempt was cancelled. You can initiate a new payment attempt.
                  </p>
                  <span className="text-sm font-black text-slate-900 mt-1 block">
                    Amount Due: ₹{booking.price}
                  </span>
                </div>
              </div>

              <Link
                to={`/payment/${booking._id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Now</span>
              </Link>
            </div>
          ) : (
            /* Payment Pending State */
            <div className="bg-blue-50/70 border-2 border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Booking Status:</span>
                  <span className="text-xs font-black text-teal-700 uppercase">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Payment Status:</span>
                  <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Payment Pending
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 pt-1">
                  ₹{booking.price}
                </div>
                <p className="text-xs text-slate-600">
                  Service has been finished by the provider. Please complete the simulated payment.
                </p>
              </div>

              <Link
                to={`/payment/${booking._id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02]"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Now</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Completed Section: Reviews & Ratings */}
      {booking.status === 'completed' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                Service Finished
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Customer Rating & Feedback
              </h2>
            </div>

            {booking.completedAt && (
              <span className="text-xs text-slate-400">
                Completed on {new Date(booking.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {existingReview ? (
            /* Display submitted review */
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-5 h-5 ${
                        s <= existingReview.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm font-extrabold text-slate-800 ml-2">
                    {existingReview.rating} out of 5 Stars
                  </span>
                </div>

                <span className="text-xs text-slate-400">
                  {new Date(existingReview.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                "{existingReview.comment}"
              </p>

              <div className="pt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Customer Review</span>
              </div>
            </div>
          ) : (
            /* Review form */
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  How was your experience?
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = (hoverRating || rating) >= starVal;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-sm font-bold text-slate-700 ml-2">
                    {rating} Star{rating > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Your Review & Comments *
                </label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details of your experience, punctuality, quality of work..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs shadow transition"
              >
                <Send className="w-4 h-4" />
                <span>{submittingReview ? 'Submitting...' : 'Submit Review'}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Cancellation Action Box */}
      {canCancel && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-rose-900">Need to Cancel this Appointment?</h3>
            <p className="text-xs text-rose-700 mt-0.5">
              You can cancel pending or accepted appointments before the technician commences work.
            </p>
          </div>

          {showCancelConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelBooking}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {actionLoading ? 'Cancelling...' : 'Yes, Confirm Cancel'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 bg-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition"
              >
                Keep Booking
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Cancel Booking
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingDetailsPage;
