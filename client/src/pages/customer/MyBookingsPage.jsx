import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  Calendar,
  Clock,
  Wrench,
  ArrowRight,
  PlusCircle,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
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

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingAPI.getMyCustomerBookings();
      if (res.data?.success) {
        setBookings(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.response?.data?.message || 'Could not load your bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Filter bookings based on activeTab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') {
      return ['pending', 'accepted', 'confirmed', 'in-progress'].includes(b.status);
    }
    if (activeTab === 'completed') {
      return b.status === 'completed';
    }
    if (activeTab === 'cancelled') {
      return ['cancelled', 'rejected'].includes(b.status);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Booking History
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            My Bookings
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            View real-time status of your service requests and appointments.
          </p>
        </div>

        <Link
          to="/providers"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Book a Service</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'active'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active / Pending (
          {bookings.filter((b) => ['pending', 'accepted', 'confirmed', 'in-progress'].includes(b.status)).length}
          )
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'completed'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Completed ({bookings.filter((b) => b.status === 'completed').length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'cancelled'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cancelled / Rejected ({bookings.filter((b) => ['cancelled', 'rejected'].includes(b.status)).length})
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Bookings List */}
      {loading ? (
        <LoadingSpinner text="Loading your bookings..." />
      ) : filteredBookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBookings.map((b) => {
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
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {b.serviceId?.name || 'Home Service'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {b.providerId?.businessName || 'Pro Provider'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${badgeClass}`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Date & Time
                      </span>
                      <span className="font-bold text-slate-800">
                        {formattedDate} at {b.scheduledTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Address</span>
                      <span className="font-medium text-slate-700 truncate max-w-[220px]">
                        {b.address?.street}, {b.address?.city}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Service Fee</span>
                      <span className="font-black text-slate-900 text-sm">₹{b.price}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    ID: {b._id.slice(-6).toUpperCase()}
                  </span>

                  <div className="flex items-center gap-2">
                    {b.status === 'accepted' && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Confirm Ready
                      </span>
                    )}
                    {b.status === 'confirmed' && (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        OTP Active
                      </span>
                    )}
                    {b.status === 'in-progress' && (
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        Working Now
                      </span>
                    )}
                    {b.status === 'completed' && (
                      b.paymentStatus === 'paid' ? (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Paid
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Payment Pending
                        </span>
                      )
                    )}
                    <Link
                      to={`/customer/bookings/${b._id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
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
            You don't have any bookings matching the current filter.
          </p>
          <Link
            to="/providers"
            className="inline-block mt-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Find a Provider
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
