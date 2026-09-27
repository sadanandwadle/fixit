import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationDropdown from './NotificationDropdown';
import {
  Wrench,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  Briefcase,
  Calendar,
  LayoutDashboard,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Bell,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout, backendHealth } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
      isActive
        ? 'text-blue-600 bg-blue-50/80 font-bold'
        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
    }`;

  // Role badge helper
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'provider':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
            <Briefcase className="w-3 h-3" /> Provider
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            <User className="w-3 h-3" /> Customer
          </span>
        );
    }
  };

  const role = user?.role;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <Wrench className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                FIX<span className="text-blue-600">IT</span>
              </span>
              <span className="block text-[10px] font-bold text-slate-400 -mt-1 tracking-wider uppercase">
                Local Services
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links based on Role */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>

            {/* Guest Navigation */}
            {!isAuthenticated && (
              <>
                <NavLink to="/services" className={navLinkClass}>
                  Services
                </NavLink>
                <NavLink to="/providers" className={navLinkClass}>
                  Providers
                </NavLink>
              </>
            )}

            {/* Customer Navigation */}
            {isAuthenticated && role === 'customer' && (
              <>
                <NavLink to="/services" className={navLinkClass}>
                  Services
                </NavLink>
                <NavLink to="/providers" className={navLinkClass}>
                  Find Providers
                </NavLink>
                <NavLink to="/customer/bookings" className={navLinkClass}>
                  My Bookings
                </NavLink>
                <NavLink to="/customer/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
              </>
            )}

            {/* Provider Navigation */}
            {isAuthenticated && role === 'provider' && (
              <>
                <NavLink to="/provider/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/provider/bookings" className={navLinkClass}>
                  Bookings
                </NavLink>
                <NavLink to="/provider/location" className={navLinkClass}>
                  Location
                </NavLink>
                <NavLink to="/provider/profile" className={navLinkClass}>
                  Profile
                </NavLink>
                <NavLink to="/provider/availability" className={navLinkClass}>
                  Availability
                </NavLink>
              </>
            )}

            {/* Admin Navigation (Phase 6) */}
            {isAuthenticated && role === 'admin' && (
              <>
                <NavLink to="/admin" className={navLinkClass}>
                  Admin Console
                </NavLink>
                <NavLink to="/services" className={navLinkClass}>
                  Services
                </NavLink>
                <NavLink to="/providers" className={navLinkClass}>
                  Find Providers
                </NavLink>
              </>
            )}
          </nav>

          {/* Status Badge & Auth Actions */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Realtime API status indicator */}
            <div
              title={
                backendHealth.online
                  ? backendHealth.dbConnected
                    ? 'Backend API and MongoDB are fully connected'
                    : 'Backend API is active; MongoDB is running in offline mode'
                  : 'Backend API is offline'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                backendHealth.online
                  ? backendHealth.dbConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth.online
                    ? backendHealth.dbConnected
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {backendHealth.online
                  ? backendHealth.dbConnected
                    ? 'MongoDB Live'
                    : 'API Ready'
                  : 'API Offline'}
              </span>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* In-App Notifications (Phase 5) */}
                <NotificationDropdown />

                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-200">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {user?.name}
                    </p>
                    {renderRoleBadge(user?.role)}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button and notifications */}
          <div className="flex lg:hidden items-center gap-2">
            {isAuthenticated && <NotificationDropdown />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          {/* Realtime API status indicator (mobile) */}
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">System Status</span>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                backendHealth.online
                  ? backendHealth.dbConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth.online
                    ? backendHealth.dbConnected
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {backendHealth.online
                  ? backendHealth.dbConnected
                    ? 'MongoDB Live'
                    : 'API Ready'
                  : 'API Offline'}
              </span>
            </div>
          </div>

          <nav className="flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Home
            </Link>

            {/* Guest */}
            {!isAuthenticated && (
              <>
                <Link
                  to="/services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Services
                </Link>
                <Link
                  to="/providers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Providers
                </Link>
              </>
            )}

            {/* Customer */}
            {isAuthenticated && role === 'customer' && (
              <>
                <Link
                  to="/services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Services
                </Link>
                <Link
                  to="/providers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Find Providers
                </Link>
                <Link
                  to="/customer/bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  My Bookings
                </Link>
                <Link
                  to="/customer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Customer Dashboard
                </Link>
              </>
            )}

            {/* Provider */}
            {isAuthenticated && role === 'provider' && (
              <>
                <Link
                  to="/provider/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Provider Dashboard
                </Link>
                <Link
                  to="/provider/bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Bookings
                </Link>
                <Link
                  to="/provider/location"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Location & Map
                </Link>
                <Link
                  to="/provider/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Profile Settings
                </Link>
                <Link
                  to="/provider/availability"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Availability
                </Link>
              </>
            )}

            {/* Admin Mobile Menu (Phase 6) */}
            {isAuthenticated && role === 'admin' && (
              <>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Admin Console
                </Link>
                <Link
                  to="/services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Services
                </Link>
                <Link
                  to="/providers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Find Providers
                </Link>
              </>
            )}

            {/* Shared Authenticated Mobile Link */}
            {isAuthenticated && (
              <Link
                to="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t border-slate-100">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{user?.name}</div>
                    <div className="text-xs text-slate-500">{user?.email}</div>
                    <div className="mt-1">{renderRoleBadge(user?.role)}</div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 rounded-xl text-sm font-semibold hover:bg-rose-100 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
