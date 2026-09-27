import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { formatRelativeTime } from '../utils/formatTime';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import {
  Bell,
  CheckCheck,
  Calendar,
  KeyRound,
  Wrench,
  CheckCircle2,
  CreditCard,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Check,
  Inbox,
  Filter,
} from 'lucide-react';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'booking_created':
    case 'booking_accepted':
    case 'booking_rejected':
    case 'booking_confirmed':
    case 'booking_cancelled':
      return <Calendar className="w-5 h-5 text-blue-600" />;
    case 'otp_generated':
      return <KeyRound className="w-5 h-5 text-indigo-600" />;
    case 'service_started':
      return <Wrench className="w-5 h-5 text-amber-600" />;
    case 'service_completed':
      return <CheckCircle2 className="w-5 h-5 text-teal-600" />;
    case 'payment_due':
    case 'payment_success':
    case 'payment_failed':
      return <CreditCard className="w-5 h-5 text-emerald-600" />;
    case 'review_received':
      return <Star className="w-5 h-5 text-amber-500 fill-amber-500" />;
    default:
      return <Bell className="w-5 h-5 text-blue-600" />;
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchNotifications({
      page: currentPage,
      limit: 20,
      isRead: activeTab === 'unread' ? false : undefined,
    });
  }, [currentPage, activeTab, fetchNotifications]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination.pages || 1)) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
              <Bell className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Stay updated on your booking activity, service lifecycle, and payments.
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-2xl transition border border-blue-200/60 shrink-0 self-start sm:self-auto"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Notifications
            </button>
            <button
              onClick={() => handleTabChange('unread')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.2 rounded-full ${
                    activeTab === 'unread'
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-blue-100 text-blue-700 font-bold'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            {pagination.total || 0} total
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message={error}
            action={
              <button
                onClick={() =>
                  fetchNotifications({
                    page: currentPage,
                    limit: 20,
                    isRead: activeTab === 'unread' ? false : undefined,
                  })
                }
                className="text-xs font-bold underline"
              >
                Retry
              </button>
            }
          />
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-16 text-center">
            <LoadingSpinner size="lg" text="Loading notifications..." />
          </div>
        ) : notifications.length === 0 ? (
          /* Empty State (Section 41) */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Inbox className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">You're all caught up!</h3>
            <p className="text-sm text-slate-500">
              {activeTab === 'unread'
                ? 'No unread notifications right now.'
                : 'No notifications yet. Activity on bookings and payments will appear here.'}
            </p>
          </div>
        ) : (
          /* Notifications List */
          <div className="space-y-3">
            {notifications.map((n) => {
              const isUnread = !n.isRead;
              return (
                <div
                  key={n._id}
                  className={`group bg-white rounded-2xl p-4 sm:p-5 transition-all duration-200 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isUnread
                      ? 'border-blue-200 bg-blue-50/30 shadow-sm hover:border-blue-300'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div
                    onClick={() => handleNotificationClick(n, navigate)}
                    className="flex items-start gap-4 flex-1 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4
                          className={`text-sm ${
                            isUnread
                              ? 'font-bold text-slate-900'
                              : 'font-semibold text-slate-800'
                          }`}
                        >
                          {n.title}
                        </h4>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
                        <span>{formatRelativeTime(n.createdAt)}</span>
                        {n.bookingId && (
                          <span className="text-slate-400">
                            • Booking:{' '}
                            <span className="font-mono text-slate-600">
                              #{String(n.bookingId?._id || n.bookingId).slice(-6)}
                            </span>
                          </span>
                        )}
                        {n.paymentId?.transactionId && (
                          <span className="text-slate-400">
                            • Txn:{' '}
                            <span className="font-mono text-slate-600">
                              {n.paymentId.transactionId}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n._id);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 transition"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark read</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleNotificationClick(n, navigate)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-bold text-slate-600">
              Page {currentPage} of {pagination.pages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.pages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
