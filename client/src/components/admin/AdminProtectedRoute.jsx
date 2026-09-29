import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AdminProtectedRoute = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">You do not have permission to view the admin area.</p>
          <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium inline-block">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
