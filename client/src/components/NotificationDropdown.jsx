import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { formatRelativeTime } from '../utils/formatTime';
import {
  Bell,
  CheckCheck,
  Calendar,
  KeyRound,
  Wrench,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  Star,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'booking_created':
    case 'booking_accepted':
    case 'booking_rejected':
    case 'booking_confirmed':
    case 'booking_cancelled':
      return <Calendar className="w-4 h-4 text-blue-600" />;
    case 'otp_generated':
      return <KeyRound className="w-4 h-4 text-indigo-600" />;
    case 'service_started':
      return <Wrench className="w-4 h-4 text-amber-600" />;
    case 'service_completed':
      return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
    case 'payment_due':
    case 'payment_success':
    case 'payment_failed':
      return <CreditCard className="w-4 h-4 text-emerald-600" />;
    case 'review_received':
      return <Star className="w-4 h-4 text-amber-500 fill-amber-500" />;
    default:
      return <Bell className="w-4 h-4 text-blue-600" />;
  }
};

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  } = useNotifications();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch latest notifications whenever dropdown is toggled open
  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications({ page: 1, limit: 10 });
      fetchUnreadCount();
    }
    setIsOpen((prev) => !prev);
  };

  const handleItemClick = (notification) => {
    setIsOpen(false);
    handleNotificationClick(notification, navigate);
  };

  const handleMarkAll = async (e) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  // Preview latest 6 notifications in dropdown
  const dropdownItems = notifications.slice(0, 6);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 stroke-[2.2]" />

        {/* Unread Badge: only render if unreadCount > 0 (Section 29) */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[19px] h-[19px] px-1 bg-blue-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-blue-500/40 animate-in fade-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-xs font-medium">Loading notifications...</p>
              </div>
            ) : error && notifications.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-700 mb-2">Unable to load notifications.</p>
                <button
                  onClick={() => fetchNotifications({ page: 1, limit: 10 })}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Try Again
                </button>
              </div>
            ) : dropdownItems.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-500">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <Bell className="w-5 h-5 stroke-[1.8]" />
                </div>
                <p className="text-xs font-bold text-slate-700">You're all caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No notifications yet.</p>
              </div>
            ) : (
              dropdownItems.map((n) => {
                const isUnread = !n.isRead;
                return (
                  <div
                    key={n._id}
                    onClick={() => handleItemClick(n)}
                    className={`px-4 py-3 cursor-pointer transition-colors duration-150 flex items-start gap-3 text-left ${
                      isUnread
                        ? 'bg-blue-50/50 hover:bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center shrink-0">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          className={`text-xs truncate ${
                            isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                          }`}
                        >
                          {n.title}
                        </p>
                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-blue-600 shrink-0"
                            title="Unread"
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer View All link */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-xl transition"
            >
              <span>View All Notifications</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
