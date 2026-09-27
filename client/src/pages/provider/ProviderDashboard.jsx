import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingAPI, providerAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wrench,
  ArrowRight,
  User,
  Phone,
  FileText,
  DollarSign,
  ShieldCheck,
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

const ProviderDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [providerProfile, setProviderProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch provider profile and provider bookings concurrently
      const [bookingsRes, profileRes] = await Promise.all([
        bookingAPI.getMyProviderBookings(),
        providerAPI.getMyProfile(),
      ]);

      if (bookingsRes.data?.success) {
        setBookings(bookingsRes.data.data || []);
      }
      if (profileRes.data?.success) {
        setProviderProfile(profileRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching provider dashboard data:', err);
      setError(err.response?.data?.message || 'Could not load provider dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAccept = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      setError(null);
      const res = await bookingAPI.accept(bookingId);
      if (res.data?.success) {
        setSuccess('Booking accepted! Customer has been notified.');
        fetchDashboardData();
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
      const res = await bookingAPI.reject(bookingId, 'Schedule conflict or service area limit');
      if (res.data?.success) {
        setSuccess('Booking has been rejected.');
        fetchDashboardData();
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

  // Real statistics computed from backend bookings
  const totalCount = bookings.length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const inProgressCount = bookings.filter((b) => b.status === 'in-progress').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  const pendingRequests = bookings.filter((b) => b.status === 'pending');
  const otherRecent = bookings.filter((b) => b.status !== 'pending').slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Provider Greeting Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Provider Dashboard
            </span>
            {providerProfile?.isVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Welcome, {providerProfile?.businessName || user?.name || 'Rahul'} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your service requests, accept new bookings, and track customer visits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/provider/availability"
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-sm"
          >
            Weekly Schedule
          </Link>
          <Link
            to="/provider/bookings"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            All Bookings ({totalCount})
          </Link>
          <Link
            to="/provider/profile"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Statistics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Requests
          </span>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 block">
            {totalCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm bg-amber-50/20">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
            Pending
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 block">
            {pendingCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm bg-blue-50/20">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
            Confirmed (OTP)
          </span>
          <span className="text-2xl sm:text-3xl font-black text-blue-600 mt-2 block">
            {confirmedCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm bg-indigo-50/20">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
            In-Progress
          </span>
          <span className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2 block">
            {inProgressCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-sm bg-teal-50/20 col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">
            Completed
          </span>
          <span className="text-2xl sm:text-3xl font-black text-teal-600 mt-2 block">
            {completedCount}
          </span>
        </div>
      </div>

      {/* NEW PENDING REQUESTS SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-xl font-black text-slate-900">
                Pending Service Requests ({pendingCount})
              </h2>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Review and accept or reject customer booking requests
            </p>
          </div>

          <Link
            to="/provider/bookings?tab=pending"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Checking for new booking requests..." />
        ) : pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingRequests.map((b) => {
              const cust = b.customerId || {};
              const formattedDate = new Date(b.scheduledDate).toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              const isActing = actionLoadingId === b._id;

              return (
                <div
                  key={b._id}
                  className="bg-gradient-to-br from-amber-50/40 via-white to-white rounded-3xl p-6 border-2 border-amber-200/80 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                          New Request
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-lg">
                          {b.serviceId?.name || 'On-demand Service'}
                        </h3>
                      </div>
                      <span className="text-xl font-black text-slate-900">₹{b.price}</span>
                    </div>

                    {/* Customer Info */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Customer:</span>
                        <span className="font-bold text-slate-800">{cust.name || 'Customer'}</span>
                      </div>
                      {cust.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Phone:</span>
                          <span className="font-semibold text-slate-700">{cust.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Date & Time:</span>
                        <span className="font-bold text-blue-700">
                          {formattedDate} at {b.scheduledTime}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-100">
                        <span className="text-slate-400 font-medium flex-shrink-0">Address:</span>
                        <span className="font-medium text-slate-700 text-right">
                          {b.address?.street}, {b.address?.city}
                        </span>
                      </div>
                    </div>

                    {/* Problem note */}
                    {b.description && (
                      <div className="text-xs bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-slate-700">
                        <span className="font-bold text-amber-900 block mb-0.5">Problem Notes:</span>
                        {b.description}
                      </div>
                    )}
                  </div>

                  {/* Accept / Reject Action Buttons */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => handleAccept(b._id)}
                      disabled={isActing}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{isActing ? 'Processing...' : 'ACCEPT'}</span>
                    </button>

                    <button
                      onClick={() => handleReject(b._id)}
                      disabled={isActing}
                      className="flex-1 py-2.5 px-4 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>REJECT</span>
                    </button>
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
          <div className="text-center py-12 text-slate-400 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No pending requests</p>
            <p className="text-xs text-slate-400">
              All booking requests have been answered. You will be notified when new customers book your services.
            </p>
          </div>
        )}
      </div>

      {/* RECENT CONFIRMED / PAST JOBS */}
      {otherRecent.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900">Recent Other Activity</h2>
            <Link
              to="/provider/bookings"
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              View Full List
            </Link>
          </div>

          <div className="space-y-3">
            {otherRecent.map((b) => {
              const badgeClass =
                statusBadgeStyles[b.status] || 'bg-slate-100 text-slate-700 border-slate-200';
              const formattedDate = new Date(b.scheduledDate).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={b._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {b.serviceId?.name || 'Service Job'}
                      </h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Customer: {b.customerId?.name || 'Customer'} • {formattedDate} at {b.scheduledTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
                    <span className="font-black text-slate-900 text-sm">₹{b.price}</span>
                    <span
                      className={`font-bold uppercase px-2.5 py-0.5 rounded-full border text-[10px] ${badgeClass}`}
                    >
                      {b.status}
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full border text-[10px] ${
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
                    <Link
                      to={`/provider/bookings/${b._id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition inline-flex items-center gap-1"
                    >
                      <span>{b.status === 'confirmed' ? 'Verify OTP' : b.status === 'in-progress' ? 'Complete' : 'View'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;
