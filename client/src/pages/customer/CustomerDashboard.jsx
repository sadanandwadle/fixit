import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingAPI, paymentAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  PlusCircle,
  Wrench,
  Search,
  CreditCard,
  Receipt,
  DollarSign,
  RefreshCw,
} from 'lucide-react';

const statusBadgeStyles = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  'in-progress': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-teal-50 text-teal-700 border-teal-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

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

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [bookingsRes, paymentsRes] = await Promise.all([
          bookingAPI.getMyCustomerBookings(),
          paymentAPI.getMyPayments().catch(() => ({ data: { success: false, data: [] } })),
        ]);

        if (bookingsRes.data?.success) {
          setBookings(bookingsRes.data.data || []);
        }
        if (paymentsRes.data?.success) {
          setPayments(paymentsRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err.response?.data?.message || 'Could not fetch your dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Compute real statistics from backend booking & payment data (Section 19)
  const totalCount = bookings.length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  // Paid count derived directly from payment records (Section 19)
  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const paymentPendingCount = bookings.filter(
    (b) => b.status === 'completed' && b.paymentStatus !== 'paid'
  ).length;

  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Customer Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Hello, {user?.name || 'Customer'} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track your home service requests and appointments in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/providers"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/25 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New Service</span>
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Statistics Cards (Section 19) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Bookings
          </span>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 block">
            {totalCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-sm bg-teal-50/20">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">
            Completed Services
          </span>
          <span className="text-2xl sm:text-3xl font-black text-teal-600 mt-2 block">
            {completedCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm bg-amber-50/20">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
            Pending Bookings
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 block">
            {pendingCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/20">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
            Paid
          </span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 block">
            {paidCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm bg-amber-50/20 col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
            Payment Pending
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 block">
            {paymentPendingCount}
          </span>
        </div>
      </div>

      {/* Recent Bookings Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900">Recent Bookings</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Your latest service requests and statuses
            </p>
          </div>
          <Link
            to="/customer/bookings"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading recent bookings..." />
        ) : recentBookings.length > 0 ? (
          <div className="space-y-4">
            {recentBookings.map((b) => {
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 transition duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {b.serviceId?.name || 'General Service'}
                      </h3>
                      <p className="text-slate-600 text-xs font-medium mt-0.5">
                        Provider: {b.providerId?.businessName || 'Service Specialist'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formattedDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {b.scheduledTime}
                        </span>
                        <span className="font-bold text-slate-700">₹{b.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-wrap">
                    <span
                      className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${badgeClass}`}
                    >
                      {b.status}
                    </span>

                    {/* Phase 4A: Payment Quick Actions */}
                    {b.status === 'completed' && (
                      b.paymentStatus === 'paid' ? (
                        <Link
                          to={`/payment/${b._id}`}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </Link>
                      ) : b.paymentStatus === 'failed' ? (
                        <Link
                          to={`/payment/${b._id}`}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1 shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Try Again</span>
                        </Link>
                      ) : (
                        <Link
                          to={`/payment/${b._id}`}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1 shadow-sm"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Now</span>
                        </Link>
                      )
                    )}

                    <Link
                      to={`/customer/bookings/${b._id}`}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition inline-flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-slate-700 font-bold text-sm">No bookings yet</p>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Find background-verified local electricians, plumbers, and mechanics near you.
            </p>
            <Link
              to="/providers"
              className="inline-block mt-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              Browse Providers
            </Link>
          </div>
        )}
      </div>

      {/* Demo Payment History Section (Section 23) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900">Demo Payment History</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Records of all simulated payments and receipts
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
            {payments.length} Transaction{payments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {payments.map((p, pIdx) => {
                  const formattedDate = new Date(p.createdAt || Date.now()).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const bookingObj = p.bookingId || {};
                  const serviceName = bookingObj.serviceId?.name || 'Local Service';
                  const providerName = bookingObj.providerId?.businessName || 'Verified Pro';

                  return (
                    <tr key={p._id || p.id || p.paymentId || p.transactionId || `pay-${pIdx}`} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{formattedDate}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{serviceName}</td>
                      <td className="py-3.5 px-4 text-slate-600">{providerName}</td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">₹{p.amount}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {CANONICAL_PAYMENT_METHOD_LABELS[p.method] || p.method}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            p.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : p.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : p.status === 'cancelled'
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {CANONICAL_PAYMENT_STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {p.transactionId || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.status === 'paid' && p.bookingId ? (
                          <Link
                            to={`/payment/${p.bookingId._id || p.bookingId}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Link>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 space-y-1">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No payment records yet</p>
            <p className="text-[11px] text-slate-400">
              When services are completed and paid, simulated receipts will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
