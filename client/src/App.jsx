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

function Home() {
  const { user, logout } = useContext(AuthContext);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-bg p-4">
      <div className="bg-surface-white p-8 rounded-xl shadow-subtle text-center max-w-md w-full border border-border-subtle">
        <h1 className="text-4xl font-bold text-primary mb-4 tracking-tight">FIXIT</h1>
        <p className="text-neutral-muted mb-6 text-lg">Phase 7: Notifications</p>
        
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
        </div>

        <div className="p-4 bg-surface-dim rounded-lg text-left border border-border-subtle">
          <p className="text-sm font-medium text-neutral-dark mb-2">User Status:</p>
          {user ? (
            <div className="mt-2 text-sm text-neutral-dark space-y-1">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <button 
                onClick={logout} 
                className="mt-4 w-full bg-status-error/10 text-status-error font-medium py-2 rounded hover:bg-status-error/20 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div>
              <p className="text-status-warning font-semibold text-sm mb-3">Not Authenticated</p>
              <div className="flex gap-2">
                <Link to="/login" className="flex-1"><Button variant="secondary" className="w-full text-xs py-1">Login</Button></Link>
                <Link to="/register" className="flex-1"><Button variant="secondary" className="w-full text-xs py-1">Register</Button></Link>
              </div>
            </div>
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
      </Routes>
    </>
  );
}

export default App;
