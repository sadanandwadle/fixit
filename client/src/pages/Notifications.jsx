import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, Button, LoadingState, ErrorState } from '../components/ui/Components';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await api.get(`/notifications?page=${pageNum}&limit=10`);
      
      if (pageNum === 1) {
        setNotifications(res.data.data);
      } else {
        setNotifications(prev => [...prev, ...res.data.data]);
      }
      
      setHasMore(res.data.pagination.page < res.data.pagination.pages);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
    if (notif.relatedBooking) {
      navigate(`/bookings/${notif.relatedBooking}`);
    }
  };

  if (loading && page === 1) return <LoadingState text="Loading notifications..." />;
  if (error) return <div className="p-8 max-w-3xl mx-auto"><ErrorState message={error} /></div>;

  return (
    <div className="min-h-screen bg-neutral-bg p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-neutral-dark tracking-tight">Notifications</h1>
          <Button variant="secondary" onClick={handleMarkAllRead}>Mark all as read</Button>
        </div>

        {notifications.length === 0 ? (
          <Card className="text-center py-12">
            <span className="text-4xl mb-4 block">📭</span>
            <h3 className="text-xl font-medium text-neutral-dark mb-2">No notifications yet</h3>
            <p className="text-neutral-muted">When you get updates, they'll show up here.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map(notif => (
              <Card 
                key={notif._id} 
                className={`cursor-pointer transition-colors hover:border-primary/50 ${!notif.isRead ? 'border-primary/30 shadow-md bg-surface-white' : 'border-border-subtle bg-surface-dim'}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {!notif.isRead && <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0"></span>}
                    <h3 className={`text-lg ${!notif.isRead ? 'font-bold text-neutral-dark' : 'font-medium text-neutral-dark'}`}>
                      {notif.title}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-neutral-muted whitespace-nowrap ml-4">
                    {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className={`text-sm ${!notif.isRead ? 'text-neutral-dark' : 'text-neutral-muted'} mb-4 ml-${!notif.isRead ? '4' : '0'}`}>
                  {notif.message}
                </p>
                {notif.relatedBooking && (
                  <div className={`ml-${!notif.isRead ? '4' : '0'}`}>
                    <span className="text-xs font-semibold text-primary hover:underline">View Booking →</span>
                  </div>
                )}
              </Card>
            ))}
            
            {hasMore && (
              <div className="flex justify-center pt-6">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchNotifications(nextPage);
                  }}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
