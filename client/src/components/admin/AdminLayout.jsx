import { Link, useLocation, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AdminLayout = () => {
  const location = useLocation();
  const { logout } = useContext(AuthContext);

  const navItems = [
    { name: 'Dashboard', path: '/admin' },
    { name: 'Users', path: '/admin/users' },
    { name: 'Providers', path: '/admin/providers' },
    { name: 'Services', path: '/admin/services' },
    { name: 'Bookings', path: '/admin/bookings' },
    { name: 'Reviews', path: '/admin/reviews' },
    { name: 'Payments', path: '/admin/payments' },
    { name: 'Audit Logs', path: '/admin/audit-logs' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-inter">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <Link to="/admin" className="text-2xl font-bold tracking-tight">
            FIXIT <span className="text-blue-400">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block px-6 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center hidden md:flex">
          <h1 className="text-xl font-semibold text-slate-800">Administration Control Panel</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 font-medium">Platform Admin</span>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
