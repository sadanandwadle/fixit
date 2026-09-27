import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

// Customer pages
import ProvidersPage from './pages/customer/ProvidersPage';
import ProviderProfilePage from './pages/customer/ProviderProfilePage';
import BookServicePage from './pages/customer/BookServicePage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import BookingDetailsPage from './pages/customer/BookingDetailsPage';
import PaymentPage from './pages/PaymentPage';
import NotificationsPage from './pages/NotificationsPage';

// Provider pages
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderBookingsPage from './pages/provider/ProviderBookingsPage';
import ProviderBookingDetailsPage from './pages/provider/ProviderBookingDetailsPage';
import ProviderSettingsProfilePage from './pages/provider/ProviderProfilePage';
import ProviderAvailabilityPage from './pages/provider/ProviderAvailabilityPage';
import ProviderLocationPage from './pages/provider/ProviderLocationPage';

// Admin pages (Phase 6)
import AdminDashboard from './pages/admin/AdminDashboard';

// Scroll to top helper on navigation
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      <ScrollToTop />
      <Navbar />
      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/providers/:id" element={<ProviderProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Customer Protected Routes */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/bookings"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/bookings/:id"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <BookingDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book/:providerId"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <BookServicePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/:bookingId"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <PaymentPage />
              </ProtectedRoute>
            }
          />

          {/* Provider Protected Routes */}
          <Route
            path="/provider/dashboard"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/bookings"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/bookings/:id"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderBookingDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/profile"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderSettingsProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/availability"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderAvailabilityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/location"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderLocationPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes (Phase 6) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Notifications Route (Shared for Authenticated Users) */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['customer', 'provider', 'admin']}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
