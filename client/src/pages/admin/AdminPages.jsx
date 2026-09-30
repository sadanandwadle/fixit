import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button, LoadingState, ErrorState, Card } from '../../components/ui/Components';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then(res => {
        setStats(res.data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Error loading statistics.');
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState text="Loading statistics..." />;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;
  if (!stats) return <div className="p-6"><ErrorState message="No statistics data available." /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Platform Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.users.total} sub={`${stats.users.customers} Customers, ${stats.users.providers} Providers`} />
        <StatCard title="Providers Verified" value={stats.providers.verified} sub={`${stats.providers.pending} pending`} />
        <StatCard title="Active Services" value={stats.services.active} sub={`Out of ${stats.services.total} total`} />
        <StatCard title="Total Bookings" value={stats.bookings.total} sub={`${stats.bookings.completed} completed, ${stats.bookings.pending} pending`} />
        <StatCard title="Total Payments" value={`$${stats.payments.revenue}`} sub={`${stats.payments.total} successful payments`} />
        <StatCard title="Total Reviews" value={stats.reviews.total} sub="Platform-wide" />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, sub }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
    <div className="text-3xl font-bold text-slate-900 mb-2">{value}</div>
    <div className="text-sm text-slate-500">{sub}</div>
  </div>
);

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/users')
      .then(res => { setUsers(res.data.data); setLoading(false); })
      .catch(err => { setError('Failed to load users'); setLoading(false); });
  }, []);

  const toggleStatus = (id, currentStatus) => {
    if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'reactivate'} this user?`)) {
      api.put(`/admin/users/${id}/status`, { isActive: !currentStatus })
        .then(() => api.get('/admin/users').then(res => setUsers(res.data.data)))
        .catch(err => alert(err.response?.data?.message || 'Error updating status'));
    }
  };

  if (loading) return <LoadingState text="Loading users..." />;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200"><h2 className="text-xl font-bold">User Management</h2></div>
      {users.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No users found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-4 font-medium text-slate-600">Name</th><th className="p-4 font-medium text-slate-600">Email</th><th className="p-4 font-medium text-slate-600">Role</th><th className="p-4 font-medium text-slate-600">Status</th><th className="p-4 font-medium text-slate-600">Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4">{u.name}</td><td className="p-4">{u.email}</td><td className="p-4 capitalize">{u.role}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="p-4">
                    <button onClick={() => toggleStatus(u._id, u.isActive)} className="text-sm font-medium text-blue-600 hover:underline">
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const Providers = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/providers')
      .then(res => { setProviders(res.data.data); setLoading(false); })
      .catch(err => { setError('Failed to load providers'); setLoading(false); });
  }, []);

  const toggleVerify = (id, currentStatus) => {
    if (window.confirm(`Are you sure you want to ${currentStatus ? 'unverify' : 'verify'} this provider?`)) {
      api.put(`/admin/providers/${id}/verify`, { verified: !currentStatus })
        .then(() => api.get('/admin/providers').then(res => setProviders(res.data.data)))
        .catch(err => alert('Error updating verification'));
    }
  };

  if (loading) return <LoadingState text="Loading providers..." />;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200"><h2 className="text-xl font-bold">Provider Management</h2></div>
      {providers.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No providers found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-4 font-medium text-slate-600">Professional Name</th><th className="p-4 font-medium text-slate-600">User Email</th><th className="p-4 font-medium text-slate-600">Verification</th><th className="p-4 font-medium text-slate-600">Actions</th></tr></thead>
            <tbody>
              {providers.map(p => (
                <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium">{p.professionalName}</td><td className="p-4">{p.user?.email || 'N/A'}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-medium ${p.verified ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{p.verified ? 'Verified' : 'Unverified'}</span></td>
                  <td className="p-4">
                    <button onClick={() => toggleVerify(p._id, p.verified)} className="text-sm font-medium text-blue-600 hover:underline">
                      {p.verified ? 'Unverify' : 'Verify'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/services')
      .then(res => { setServices(res.data.data); setLoading(false); })
      .catch(err => { setError('Failed to load services'); setLoading(false); });
  }, []);

  const toggleActive = (id, currentStatus) => {
    if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this service?`)) {
      api.put(`/admin/services/${id}`, { active: !currentStatus })
        .then(() => api.get('/admin/services').then(res => setServices(res.data.data)));
    }
  };

  if (loading) return <LoadingState text="Loading services..." />;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center"><h2 className="text-xl font-bold">Services Catalog</h2></div>
      {services.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No services found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-4 font-medium text-slate-600">Name</th><th className="p-4 font-medium text-slate-600">Category</th><th className="p-4 font-medium text-slate-600">Status</th><th className="p-4 font-medium text-slate-600">Actions</th></tr></thead>
            <tbody>
              {services.map(s => (
                <tr key={s._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium">{s.name}</td><td className="p-4">{s.category}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="p-4">
                    <button onClick={() => toggleActive(s._id, s.active)} className="text-sm font-medium text-blue-600 hover:underline">
                      {s.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/bookings')
      .then(res => { setBookings(res.data.data); setLoading(false); })
      .catch(err => { setError('Failed to load bookings'); setLoading(false); });
  }, []);

  if (loading) return <LoadingState text="Loading bookings..." />;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200"><h2 className="text-xl font-bold">Booking Monitor</h2></div>
      {bookings.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No bookings found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-4 font-medium text-slate-600">ID</th><th className="p-4 font-medium text-slate-600">Customer</th><th className="p-4 font-medium text-slate-600">Provider</th><th className="p-4 font-medium text-slate-600">Status</th><th className="p-4 font-medium text-slate-600">Date</th></tr></thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-xs font-mono">{b._id.slice(-6)}</td><td className="p-4">{b.customer?.name}</td><td className="p-4">{b.provider?.professionalName}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs capitalize">{b.status}</span></td><td className="p-4 text-sm">{new Date(b.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/reviews')
      .then(res => { setReviews(res.data.data); setLoading(false); })
      .catch(err => { setError('Failed to load reviews'); setLoading(false); });
  }, []);

  const toggleMod = (id, currentStatus) => {
    api.put(`/admin/reviews/${id}/moderate`, { isModerated: !currentStatus })
      .then(() => api.get('/admin/reviews').then(res => setReviews(res.data.data)));
  };

  if (loading) return <LoadingState text="Loading reviews..." />;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200"><h2 className="text-xl font-bold">Review Moderation</h2></div>
      {reviews.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No reviews found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-4 font-medium text-slate-600">Rating</th><th className="p-4 font-medium text-slate-600">Comment</th><th className="p-4 font-medium text-slate-600">Provider</th><th className="p-4 font-medium text-slate-600">Moderated</th><th className="p-4 font-medium text-slate-600">Action</th></tr></thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-bold">{r.rating}/5</td><td className="p-4 text-sm max-w-xs truncate">{r.comment}</td><td className="p-4">{r.provider?.professionalName}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${r.isModerated ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.isModerated ? 'Yes' : 'No'}</span></td>
                  <td className="p-4"><button onClick={() => toggleMod(r._id, r.isModerated)} className="text-sm text-blue-600 hover:underline">{r.isModerated ? 'Unmoderate' : 'Moderate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/payments')
      .then(res => { setPayments(res.data.data); setLoading(false); })
      .catch(err => { setError('Failed to load payments'); setLoading(false); });
  }, []);

  if (loading) return <LoadingState text="Loading payments..." />;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between"><h2 className="text-xl font-bold">Payments</h2><span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">Demo Mode</span></div>
      {payments.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No payments found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-4 font-medium text-slate-600">Tx ID</th><th className="p-4 font-medium text-slate-600">Amount</th><th className="p-4 font-medium text-slate-600">Customer</th><th className="p-4 font-medium text-slate-600">Provider</th><th className="p-4 font-medium text-slate-600">Status</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-xs font-mono">{p.transactionId}</td><td className="p-4 font-bold">${p.amount}</td><td className="p-4">{p.customer?.name}</td><td className="p-4">{p.provider?.professionalName}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs capitalize">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/audit-logs')
      .then(res => { setLogs(res.data.data); setLoading(false); })
      .catch(err => { setError('Failed to load audit logs'); setLoading(false); });
  }, []);

  if (loading) return <LoadingState text="Loading audit logs..." />;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200"><h2 className="text-xl font-bold">Audit Logs</h2></div>
      {logs.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No audit logs found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-4 font-medium text-slate-600">Date</th><th className="p-4 font-medium text-slate-600">Admin</th><th className="p-4 font-medium text-slate-600">Action</th><th className="p-4 font-medium text-slate-600">Entity</th><th className="p-4 font-medium text-slate-600">Details</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l._id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                  <td className="p-4 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td><td className="p-4">{l.admin?.email}</td>
                  <td className="p-4 font-mono text-xs">{l.action}</td><td className="p-4">{l.entityType} ({l.entityId?.slice(-6)})</td><td className="p-4">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
