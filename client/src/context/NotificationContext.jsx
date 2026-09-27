import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const pollingTimerRef = useRef(null);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationAPI.getUnreadCount();
      if (res.data?.success) {
        setUnreadCount(res.data.count || 0);
      }
    } catch (err) {
      // Non-fatal: silent error for background count check
      console.warn('[NotificationContext] Failed to fetch unread count:', err.message);
    }
  }, [isAuthenticated]);

  // Fetch full notifications list (with pagination)
  const fetchNotifications = useCallback(
    async ({ page = 1, limit = 20, isRead } = {}) => {
      if (!isAuthenticated) {
        setNotifications([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await notificationAPI.getAll({ page, limit, isRead });
        if (res.data?.success) {
          setNotifications(res.data.notifications || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        console.error('[NotificationContext] Failed to fetch notifications:', err.message);
        setError(err.response?.data?.message || 'Unable to load notifications.');
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated]
  );

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;
      try {
        // Optimistic UI update
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        await notificationAPI.markAsRead(notificationId);
      } catch (err) {
        console.error('[NotificationContext] Failed to mark as read:', err.message);
        // Refresh to guarantee authoritative database state
        fetchUnreadCount();
      }
    },
    [fetchUnreadCount]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);

      await notificationAPI.markAllAsRead();
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all as read:', err.message);
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // Handle clicking a notification (marks as read and navigates to target route)
  const handleNotificationClick = useCallback(
    (notification, navigate) => {
      if (!notification) return;

      // Mark as read immediately if not already read
      if (!notification.isRead) {
        markAsRead(notification._id);
      }

      if (!navigate) return;

      const userRole = user?.role || 'customer';
      const bId =
        notification.bookingId?._id ||
        (typeof notification.bookingId === 'string' ? notification.bookingId : null);

      if (userRole === 'customer') {
        if (notification.type === 'payment_due' && bId) {
          navigate(`/payment/${bId}`);
        } else if (bId) {
          navigate(`/customer/bookings/${bId}`);
        }
      } else if (userRole === 'provider') {
        if (bId) {
          navigate(`/provider/bookings/${bId}`);
        } else if (notification.type === 'review_received') {
          navigate('/provider/profile');
        }
      } else {
        if (bId) {
          navigate(`/customer/bookings/${bId}`);
        }
      }
    },
    [user, markAsRead]
  );

  // Initial load and lightweight polling (Section 37: 30-45s)
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      return;
    }

    // Fetch initial count
    fetchUnreadCount();

    // Start lightweight polling interval (45 seconds)
    pollingTimerRef.current = setInterval(() => {
      fetchUnreadCount();
    }, 45000);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [isAuthenticated, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
