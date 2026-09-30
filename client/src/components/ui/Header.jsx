import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { Badge, Button } from './Components';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (error) {
      console.error('Failed to fetch unread notifications');
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications?limit=5');
      setNotifications(res.data.data);
    } catch (error) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    const nextState = !isDropdownOpen;
    setIsDropdownOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await api.post(`/notifications/${notification._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error(err);
      }
    }
    
    setIsDropdownOpen(false);
    if (notification.relatedBooking) {
      navigate(`/bookings/${notification.relatedBooking}`);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="bg-surface-white border-b border-border-subtle shadow-sm relative z-50">
      <div className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-bold text-primary tracking-tight">FIXIT</Link>
          <div className="hidden md:flex gap-6">
            <Link to="/services" className="text-sm font-medium text-neutral-dark hover:text-primary transition-colors">Browse Services</Link>
            <Link to="/providers" className="text-sm font-medium text-neutral-dark hover:text-primary transition-colors">Find Provider</Link>
            {user && (
              <Link to="/bookings" className="text-sm font-medium text-neutral-dark hover:text-primary transition-colors">My Bookings</Link>
            )}
            {user && user.role === 'admin' && (
              <Link to="/admin" className="text-sm font-medium text-neutral-dark hover:text-primary transition-colors">Admin Dashboard</Link>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          {!user ? (
            <div className="hidden sm:flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-neutral-dark hover:text-primary transition-colors">Login</Link>
              <Link to="/register">
                <Button variant="primary" className="text-sm py-1.5 px-4 h-auto">Register</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={toggleDropdown}
                  className="relative text-neutral-dark hover:text-primary transition-colors focus:outline-none"
                >
                  <span className="text-2xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-status-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-surface-white border border-border-subtle rounded-md shadow-lg overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-dim">
                      <h3 className="font-bold text-neutral-dark">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {loading ? (
                        <div className="p-4 text-center text-sm text-neutral-muted">Loading...</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-neutral-muted">No notifications found.</div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif._id} 
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 border-b border-border-subtle cursor-pointer transition-colors hover:bg-neutral-bg ${!notif.isRead ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className={`text-sm ${!notif.isRead ? 'font-bold text-neutral-dark' : 'font-medium text-neutral-dark'}`}>
                                {notif.title}
                              </h4>
                              {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1"></span>}
                            </div>
                            <p className="text-xs text-neutral-muted mb-2 line-clamp-2">{notif.message}</p>
                            <span className="text-[10px] text-neutral-muted">{new Date(notif.createdAt).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <Link 
                      to="/notifications" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="p-3 text-center text-sm font-medium text-primary hover:bg-neutral-bg border-t border-border-subtle block"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-3 border-l border-border-subtle pl-6">
                <div className="text-sm font-medium text-neutral-dark">
                  {user.name} <span className="text-xs text-neutral-muted bg-surface-dim px-2 py-0.5 rounded-full ml-1">{user.role}</span>
                </div>
                <button 
                  onClick={() => { logout(); navigate('/login'); }} 
                  className="text-sm text-neutral-muted hover:text-status-error font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          )}
          
          <button 
            className="md:hidden text-neutral-dark text-2xl focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            ☰
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border-subtle bg-surface-white px-6 py-4 flex flex-col gap-4">
          <Link to="/services" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-neutral-dark">Browse Services</Link>
          <Link to="/providers" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-neutral-dark">Find Provider</Link>
          {user && (
            <Link to="/bookings" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-neutral-dark">My Bookings</Link>
          )}
          {user && user.role === 'admin' && (
            <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-neutral-dark">Admin Dashboard</Link>
          )}
          
          <div className="border-t border-border-subtle pt-4 mt-2">
            {!user ? (
              <div className="flex flex-col gap-3">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-neutral-dark">Login</Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-primary">Register</Link>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-neutral-dark">
                  {user.name} <span className="text-xs text-neutral-muted bg-surface-dim px-2 py-0.5 rounded-full ml-1">{user.role}</span>
                </div>
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); logout(); navigate('/login'); }} 
                  className="text-sm text-status-error font-medium"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
