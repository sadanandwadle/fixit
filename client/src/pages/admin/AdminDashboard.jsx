import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  CreditCard,
  Star,
  Layers,
  Bell,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  Eye,
  MapPin,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { SERVICE_CATEGORIES } from '../../utils/constants';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview | users | providers | bookings | reviews | payments | services | logs
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Tab Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [providersList, setProvidersList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);

  // Search & Filter States
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [providerVerifiedFilter, setProviderVerifiedFilter] = useState('all');
  const [providerSearch, setProviderSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // Inspection & Modals
  const [inspectItem, setInspectItem] = useState(null); // { type: 'booking'|'user'|'payment', data: ... }
  const [serviceModal, setServiceModal] = useState({ open: false, mode: 'create', data: null });
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'Electrician',
    description: '',
    basePrice: 499,
    icon: 'Wrench',
    status: 'active',
  });

  // Action Loading
  const [actionLoading, setActionLoading] = useState(false);

  // Load Dashboard Overview initially
  useEffect(() => {
    loadTabContent(activeTab);
  }, [activeTab]);

  const loadTabContent = async (tab) => {
    try {
      setLoading(true);
      setError(null);

      if (tab === 'overview') {
        const res = await adminAPI.getDashboard();
        setDashboardData(res.data.data);
      } else if (tab === 'users') {
        const res = await adminAPI.getUsers({
          role: userRoleFilter !== 'all' ? userRoleFilter : undefined,
          search: userSearch || undefined,
        });
        setUsersList(res.data.data || []);
      } else if (tab === 'providers') {
        const res = await adminAPI.getProviders({
          verified: providerVerifiedFilter !== 'all' ? providerVerifiedFilter : undefined,
          search: providerSearch || undefined,
        });
        setProvidersList(res.data.data || []);
      } else if (tab === 'bookings') {
        const res = await adminAPI.getBookings({
          status: bookingStatusFilter !== 'all' ? bookingStatusFilter : undefined,
        });
        setBookingsList(res.data.data || []);
      } else if (tab === 'reviews') {
        const res = await adminAPI.getReviews();
        setReviewsList(res.data.data || []);
      } else if (tab === 'payments') {
        const res = await adminAPI.getPayments({
          status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
        });
        setPaymentsList(res.data.data || []);
      } else if (tab === 'services') {
        const res = await adminAPI.getServices();
        setServicesList(res.data.data || []);
      } else if (tab === 'logs') {
        const res = await adminAPI.getNotifications();
        setNotificationsList(res.data.data || []);
      }
    } catch (err) {
      console.error(`Failed to load ${tab}:`, err);
      setError(err.response?.data?.message || `Could not load ${tab} data.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTabContent(activeTab);
    setRefreshing(false);
  };

  // Provider Verification Toggle
  const handleToggleVerification = async (providerId, currentStatus) => {
    try {
      setActionLoading(true);
      const res = await adminAPI.toggleProviderVerification(providerId, !currentStatus);
      setSuccessMsg(res.data.message || 'Provider verification status updated');
      // Update local state
      setProvidersList((prev) =>
        prev.map((p) => (p._id === providerId ? { ...p, isVerified: !currentStatus } : p))
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle verification status');
    } finally {
      setActionLoading(false);
    }
  };

  // Review Deletion & Recalculation
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review? The provider rating will be recalculated.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await adminAPI.deleteReview(reviewId);
      setSuccessMsg(res.data.message || 'Review removed and provider rating recalculated.');
      setReviewsList((prev) => prev.filter((r) => r._id !== reviewId));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setActionLoading(false);
    }
  };

  // Service CRUD handlers
  const handleOpenServiceModal = (mode, svc = null) => {
    if (mode === 'edit' && svc) {
      setServiceModal({ open: true, mode: 'edit', data: svc });
      setServiceForm({
        name: svc.name || '',
        category: svc.category || 'Electrician',
        description: svc.description || '',
        basePrice: svc.basePrice || 499,
        icon: svc.icon || 'Wrench',
        status: svc.status || 'active',
      });
    } else {
      setServiceModal({ open: true, mode: 'create', data: null });
      setServiceForm({
        name: '',
        category: 'Electrician',
        description: '',
        basePrice: 499,
        icon: 'Wrench',
        status: 'active',
      });
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      if (serviceModal.mode === 'create') {
        const res = await adminAPI.createService(serviceForm);
        setSuccessMsg(res.data.message || 'Service created successfully');
      } else {
        const res = await adminAPI.updateService(serviceModal.data._id, serviceForm);
        setSuccessMsg(res.data.message || 'Service updated successfully');
      }
      setServiceModal({ open: false, mode: 'create', data: null });
      loadTabContent('services');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save service');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteService = async (serviceId, activeBookingsCount) => {
    if (activeBookingsCount > 0) {
      alert(`Cannot delete this service: ${activeBookingsCount} active booking(s) exist. Please set status to 'inactive' instead.`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this service? It will be removed from all provider catalogs.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await adminAPI.deleteService(serviceId);
      setSuccessMsg(res.data.message || 'Service deleted successfully');
      setServicesList((prev) => prev.filter((s) => s._id !== serviceId));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete service');
    } finally {
      setActionLoading(false);
    }
  };

  // Inspect Booking Full Modal
  const handleInspectBooking = async (bookingId) => {
    try {
      setActionLoading(true);
      const res = await adminAPI.getBookingById(bookingId);
      setInspectItem({ type: 'booking', data: res.data.data });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load booking details');
    } finally {
      setActionLoading(false);
    }
  };

  // Inspect User Modal
  const handleInspectUser = async (userId) => {
    try {
      setActionLoading(true);
      const res = await adminAPI.getUserById(userId);
      setInspectItem({ type: 'user', data: res.data.data });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user details');
    } finally {
      setActionLoading(false);
    }
  };

  // Inspect Payment Modal
  const handleInspectPayment = async (paymentId) => {
    try {
      setActionLoading(true);
      const res = await adminAPI.getPaymentById(paymentId);
      setInspectItem({ type: 'payment', data: res.data.data });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payment details');
    } finally {
      setActionLoading(false);
    }
  };

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'providers', label: 'Providers', icon: Briefcase },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'logs', label: 'Audit Logs', icon: Bell },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
            System Administration
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2">
            Admin Management Console
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Supervise platform metrics, audit users and providers, manage services, and moderate reviews.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 shadow-sm transition active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <LoadingSpinner text={`Loading ${activeTab} data...`} />
      ) : (
        <div>
          {/* ============================================== */}
          {/* 1. OVERVIEW TAB */}
          {/* ============================================== */}
          {activeTab === 'overview' && dashboardData && (
            <div className="space-y-8">
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Users Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    {dashboardData.users?.total || 0}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-blue-600">{dashboardData.users?.customers || 0} Cust</span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-600">{dashboardData.users?.providers || 0} Prov</span>
                    <span>•</span>
                    <span className="font-semibold text-purple-600">{dashboardData.users?.admins || 0} Admin</span>
                  </div>
                </div>

                {/* Providers Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Service Providers</span>
                    <Briefcase className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    {dashboardData.providers?.total || 0}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-emerald-600">
                      {dashboardData.providers?.verified || 0} Verified
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-amber-600">
                      {dashboardData.providers?.unverified || 0} Pending
                    </span>
                  </div>
                </div>

                {/* Bookings Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    {dashboardData.bookings?.total || 0}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-emerald-600">
                      {dashboardData.bookings?.completed || 0} Completed
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-blue-600">
                      {dashboardData.bookings?.pending || 0} Pending
                    </span>
                  </div>
                </div>

                {/* Revenue Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    ₹{dashboardData.payments?.totalRevenue?.toLocaleString() || 0}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-slate-700">
                      {dashboardData.payments?.totalTransactions || 0} Transactions
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Stats: Bookings Status Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Booking Lifecycle Distribution
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-700 font-semibold">Pending</p>
                    <p className="text-xl font-bold text-amber-900 mt-1">{dashboardData.bookings?.pending || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-700 font-semibold">Accepted</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">{dashboardData.bookings?.accepted || 0}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-xs text-indigo-700 font-semibold">Confirmed</p>
                    <p className="text-xl font-bold text-indigo-900 mt-1">{dashboardData.bookings?.confirmed || 0}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-xs text-purple-700 font-semibold">In Progress</p>
                    <p className="text-xl font-bold text-purple-900 mt-1">{dashboardData.bookings?.inProgress || 0}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-700 font-semibold">Completed</p>
                    <p className="text-xl font-bold text-emerald-900 mt-1">{dashboardData.bookings?.completed || 0}</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <p className="text-xs text-rose-700 font-semibold">Cancelled</p>
                    <p className="text-xl font-bold text-rose-900 mt-1">{dashboardData.bookings?.cancelled || 0}</p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-700 font-semibold">Rejected</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{dashboardData.bookings?.rejected || 0}</p>
                  </div>
                </div>
              </div>

              {/* Recent Bookings and Payments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Bookings */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Recent Bookings
                    </h3>
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {dashboardData.recent?.bookings?.length > 0 ? (
                      dashboardData.recent.bookings.map((b) => (
                        <div
                          key={b._id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-800">
                              {b.serviceId?.name || 'Service'}
                            </p>
                            <p className="text-slate-500 mt-0.5">
                              Cust: {b.customerId?.name || 'N/A'} • Prov: {b.providerId?.businessName || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 block">₹{b.price}</span>
                            <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {b.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">No bookings recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Recent Payments
                    </h3>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {dashboardData.recent?.payments?.length > 0 ? (
                      dashboardData.recent.payments.map((p) => (
                        <div
                          key={p._id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                        >
                          <div>
                            <p className="font-mono font-bold text-slate-800">
                              {p.transactionId || 'Pending TXN'}
                            </p>
                            <p className="text-slate-500 mt-0.5">
                              Cust: {p.customerId?.name || 'N/A'} • Method: {p.method?.toUpperCase()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 block">₹{p.amount}</span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                p.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">No payments recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* 2. USERS MANAGEMENT TAB */}
          {/* ============================================== */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search & Role Filter */}
              <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex-1 flex items-center gap-2 px-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadTabContent('users')}
                    placeholder="Search users by name, email, or phone..."
                    className="w-full text-xs font-medium text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                  <span className="text-xs text-slate-500 font-semibold">Role:</span>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => {
                      setUserRoleFilter(e.target.value);
                      setTimeout(() => loadTabContent('users'), 50);
                    }}
                    className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Roles</option>
                    <option value="customer">Customer</option>
                    <option value="provider">Provider</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button
                    onClick={() => loadTabContent('users')}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">City</th>
                        <th className="py-3 px-4">Joined</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{u.email}</div>
                            <div className="text-[11px] text-slate-400">{u.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : u.role === 'provider'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{u.address?.city || '—'}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleInspectUser(u._id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* 3. PROVIDERS MANAGEMENT TAB */}
          {/* ============================================== */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex-1 flex items-center gap-2 px-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadTabContent('providers')}
                    placeholder="Search by business name or owner name..."
                    className="w-full text-xs font-medium text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                  <span className="text-xs text-slate-500 font-semibold">Verification:</span>
                  <select
                    value={providerVerifiedFilter}
                    onChange={(e) => {
                      setProviderVerifiedFilter(e.target.value);
                      setTimeout(() => loadTabContent('providers'), 50);
                    }}
                    className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Providers</option>
                    <option value="true">Verified Only</option>
                    <option value="false">Unverified Only</option>
                  </select>

                  <button
                    onClick={() => loadTabContent('providers')}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {/* Providers Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Business / Owner</th>
                        <th className="py-3 px-4">Location & Coverage</th>
                        <th className="py-3 px-4">Rating</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Verification Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {providersList.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{p.businessName}</div>
                            <div className="text-[11px] text-slate-500">
                              By {p.userId?.name || 'Unknown'} ({p.userId?.email || 'N/A'})
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{p.address?.city || p.serviceArea?.[0] || 'Unspecified City'}</div>
                            <div className="text-[11px] text-slate-400">
                              Radius: {p.serviceRadius || 15} km
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {p.rating > 0 ? p.rating.toFixed(1) : 'New'} ({p.totalReviews || 0})
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {p.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Unverified
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleToggleVerification(p._id, p.isVerified)}
                              disabled={actionLoading}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                                p.isVerified
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {p.isVerified ? 'Revoke Verification' : 'Verify Provider'}
                            </button>

                            <Link
                              to={`/providers/${p._id}`}
                              target="_blank"
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <span>Profile</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* 4. BOOKINGS INSPECTION TAB */}
          {/* ============================================== */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Filter by Status:</span>
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => {
                      setBookingStatusFilter(e.target.value);
                      setTimeout(() => loadTabContent('bookings'), 50);
                    }}
                    className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Bookings</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <span className="text-xs text-slate-500 font-medium">
                  Total: {bookingsList.length} bookings
                </span>
              </div>

              {/* Bookings Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Booking ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Provider</th>
                        <th className="py-3 px-4">Service</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookingsList.map((b) => (
                        <tr key={b._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            #{b._id.slice(-6).toUpperCase()}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {b.customerId?.name || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {b.providerId?.businessName || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {b.serviceId?.name || 'Service'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {new Date(b.scheduledDate).toLocaleDateString()} at {b.scheduledTime}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                            ₹{b.price}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                b.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'in-progress'
                                  ? 'bg-purple-100 text-purple-800'
                                  : b.status === 'confirmed'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : b.status === 'cancelled' || b.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleInspectBooking(b._id)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* 5. REVIEWS MODERATION TAB */}
          {/* ============================================== */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Review Moderation Console</h3>
                  <p className="text-xs text-slate-500">
                    Deleting inappropriate or spam reviews will automatically recalculate the provider's overall score.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  Total Reviews: {reviewsList.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewsList.map((r) => (
                  <div
                    key={r._id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {r.customerId?.name || 'Customer'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Reviewed: <strong className="text-slate-700">{r.providerId?.businessName || 'Provider'}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                          <span>{r.rating}.0</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic my-2">
                        "{r.comment}"
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>

                      <button
                        onClick={() => handleDeleteReview(r._id)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Review</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* 6. PAYMENTS AUDIT TAB */}
          {/* ============================================== */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Filter by Status:</span>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => {
                      setPaymentStatusFilter(e.target.value);
                      setTimeout(() => loadTabContent('payments'), 50);
                    }}
                    className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Payments</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <span className="text-xs text-slate-500 font-medium">
                  {paymentsList.length} transactions
                </span>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Transaction ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentsList.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {p.transactionId || 'PENDING'}
                          </td>
                          <td className="py-3 px-4 text-slate-800">
                            {p.customerId?.name || 'Customer'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            ₹{p.amount}
                          </td>
                          <td className="py-3 px-4 uppercase text-slate-600 font-bold">
                            {p.method}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                p.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'failed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleInspectPayment(p._id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* 7. SERVICES CATALOG CRUD TAB */}
          {/* ============================================== */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Service Catalog Manager</h3>
                  <p className="text-xs text-slate-500">
                    Add new categories, adjust benchmark prices, and maintain platform service standards.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenServiceModal('create')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Service</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Service Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Base Price</th>
                        <th className="py-3 px-4">Providers Offering</th>
                        <th className="py-3 px-4">Active Bookings</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {servicesList.map((s) => (
                        <tr key={s._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                          <td className="py-3 px-4">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                              {s.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            ₹{s.basePrice}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-semibold">
                            {s.providerCount || 0} providers
                          </td>
                          <td className="py-3 px-4">
                            {s.activeBookingsCount > 0 ? (
                              <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                                {s.activeBookingsCount} active
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                s.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenServiceModal('edit', s)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteService(s._id, s.activeBookingsCount)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* 8. AUDIT LOGS / NOTIFICATIONS TAB */}
          {/* ============================================== */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">System Notification & Event Log</h3>
                  <p className="text-xs text-slate-500">
                    Real-time in-app notification events generated across bookings, payments, and verifications.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  Logged: {notificationsList.length} events
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Event Type</th>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Title & Message</th>
                        <th className="py-3 px-4">Read Status</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {notificationsList.map((n) => (
                        <tr key={n._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">
                            {n.type}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800">
                              {n.recipientId?.name || 'User'}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {n.recipientId?.role?.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            <div className="font-bold text-slate-900">{n.title}</div>
                            <div className="text-slate-500 text-[11px] truncate">{n.message}</div>
                          </td>
                          <td className="py-3 px-4">
                            {n.isRead ? (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                Read
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                Unread
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================== */}
      {/* INSPECT MODAL (Booking / User / Payment) */}
      {/* ============================================== */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {inspectItem.type} Audit Inspection
              </h3>
              <button
                onClick={() => setInspectItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {inspectItem.type === 'booking' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <p className="font-bold text-slate-800">Booking ID: {inspectItem.data.booking._id}</p>
                    <p className="text-slate-600">Status: <strong className="uppercase">{inspectItem.data.booking.status}</strong></p>
                    <p className="text-slate-600">Payment Status: <strong className="uppercase">{inspectItem.data.booking.paymentStatus}</strong></p>
                    <p className="text-slate-600">Date: {new Date(inspectItem.data.booking.scheduledDate).toLocaleDateString()} at {inspectItem.data.booking.scheduledTime}</p>
                    <p className="text-slate-600">Address: {inspectItem.data.booking.address?.street}, {inspectItem.data.booking.address?.city}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50/50 rounded-xl">
                      <p className="font-bold text-blue-900">Customer</p>
                      <p>{inspectItem.data.booking.customerId?.name}</p>
                      <p>{inspectItem.data.booking.customerId?.email}</p>
                      <p>{inspectItem.data.booking.customerId?.phone}</p>
                    </div>
                    <div className="p-3 bg-emerald-50/50 rounded-xl">
                      <p className="font-bold text-emerald-900">Provider</p>
                      <p>{inspectItem.data.booking.providerId?.businessName}</p>
                      <p>Owner: {inspectItem.data.booking.providerId?.userId?.name}</p>
                      <p>{inspectItem.data.booking.providerId?.userId?.phone}</p>
                    </div>
                  </div>

                  {inspectItem.data.payment && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="font-bold text-slate-900">Linked Payment Details</p>
                      <p>Transaction ID: <span className="font-mono font-bold">{inspectItem.data.payment.transactionId || 'N/A'}</span></p>
                      <p>Amount: ₹{inspectItem.data.payment.amount} ({inspectItem.data.payment.status})</p>
                      <p>Method: {inspectItem.data.payment.method?.toUpperCase()}</p>
                    </div>
                  )}

                  {inspectItem.data.review && (
                    <div className="p-3 bg-amber-50/50 rounded-xl">
                      <p className="font-bold text-amber-900">Customer Review</p>
                      <p>Rating: {inspectItem.data.review.rating} / 5</p>
                      <p className="italic">"{inspectItem.data.review.comment}"</p>
                    </div>
                  )}
                </div>
              )}

              {inspectItem.type === 'user' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <p className="font-bold text-slate-900 text-sm">{inspectItem.data.user.name}</p>
                    <p>Email: {inspectItem.data.user.email}</p>
                    <p>Phone: {inspectItem.data.user.phone}</p>
                    <p>Role: <strong className="uppercase">{inspectItem.data.user.role}</strong></p>
                    <p>Joined: {new Date(inspectItem.data.user.createdAt).toLocaleString()}</p>
                  </div>

                  {inspectItem.data.stats && (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <p className="font-bold text-lg text-blue-900">{inspectItem.data.stats.customerBookingsCount}</p>
                        <p className="text-[10px] text-blue-700">Cust Bookings</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-xl">
                        <p className="font-bold text-lg text-emerald-900">{inspectItem.data.stats.providerBookingsCount}</p>
                        <p className="text-[10px] text-emerald-700">Prov Bookings</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-xl">
                        <p className="font-bold text-lg text-purple-900">{inspectItem.data.stats.paymentsCount}</p>
                        <p className="text-[10px] text-purple-700">Payments</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {inspectItem.type === 'payment' && (
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 font-mono">
                  <p>Transaction ID: <strong>{inspectItem.data.transactionId || 'PENDING'}</strong></p>
                  <p>Amount: ₹{inspectItem.data.amount}</p>
                  <p>Status: {inspectItem.data.status?.toUpperCase()}</p>
                  <p>Method: {inspectItem.data.method?.toUpperCase()}</p>
                  <p>Customer: {inspectItem.data.customerId?.name} ({inspectItem.data.customerId?.email})</p>
                  <p>Provider: {inspectItem.data.providerId?.businessName}</p>
                  <p>Created: {new Date(inspectItem.data.createdAt).toLocaleString()}</p>
                  {inspectItem.data.paidAt && (
                    <p>Paid At: {new Date(inspectItem.data.paidAt).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* SERVICE MODAL (Create / Edit) */}
      {/* ============================================== */}
      {serviceModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {serviceModal.mode === 'create' ? 'Add New Catalog Service' : 'Edit Service'}
              </h3>
              <button
                onClick={() => setServiceModal({ open: false, mode: 'create', data: null })}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="e.g. Geyser Installation & Repair"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Base Benchmark Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={serviceForm.basePrice}
                    onChange={(e) => setServiceForm({ ...serviceForm, basePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows="3"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Comprehensive description of standard diagnostic and repair work included..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Icon Identifier</label>
                  <input
                    type="text"
                    value={serviceForm.icon}
                    onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })}
                    placeholder="Wrench, Zap, Droplet..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={serviceForm.status}
                    onChange={(e) => setServiceForm({ ...serviceForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setServiceModal({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-sm"
                >
                  {serviceModal.mode === 'create' ? 'Create Service' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
