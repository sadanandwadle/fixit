import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Services from './pages/Services';
import Providers from './pages/Providers';
import ProviderProfile from './pages/ProviderProfile';
import BookService from './pages/BookService';
import Bookings from './pages/Bookings';
import BookingDetail from './pages/BookingDetail';
import Notifications from './pages/Notifications';
import { ProtectedRoute } from './components/ui/ProtectedRoute';
import { Button } from './components/ui/Components';
import Header from './components/ui/Header';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import { Dashboard as AdminDashboard, Users as AdminUsers, Providers as AdminProviders, Services as AdminServices, Bookings as AdminBookings, Reviews as AdminReviews, Payments as AdminPayments, AuditLogs as AdminAuditLogs } from './pages/admin/AdminPages';

function Home() {
  const { user, logout } = useContext(AuthContext);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-bg p-4">
      <div className="bg-surface-white p-8 rounded-xl shadow-subtle text-center max-w-md w-full border border-border-subtle">
        <h1 className="text-4xl font-bold text-primary mb-4 tracking-tight">FIXIT</h1>
        <p className="text-neutral-muted mb-6 text-lg">Your Trusted Local Services Marketplace</p>
        
        <div className="space-y-4 mb-8">
          <Link to="/services">
            <Button className="w-full">Browse Services</Button>
          </Link>
          <Link to="/providers">
            <Button variant="secondary" className="w-full">Find a Provider</Button>
          </Link>
          {user && (
            <Link to="/bookings">
              <Button variant="secondary" className="w-full">My Bookings</Button>
            </Link>
          )}
          {user && user.role === 'admin' && (
            <Link to="/admin">
              <Button variant="secondary" className="w-full">Admin Dashboard</Button>
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/services" element={<Services />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/providers/:id" element={<ProviderProfile />} />
        
        <Route path="/book/:providerId" element={
          <ProtectedRoute>
            <BookService />
          </ProtectedRoute>
        } />
        <Route path="/bookings" element={
          <ProtectedRoute>
            <Bookings />
          </ProtectedRoute>
        } />
        <Route path="/bookings/:id" element={
          <ProtectedRoute>
            <BookingDetail />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="providers" element={<AdminProviders />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
