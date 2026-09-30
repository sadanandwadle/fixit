import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button, Input, Select, Card, ErrorState } from '../components/ui/Components';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password, role);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'customer', label: 'Customer (Looking for services)' },
    { value: 'provider', label: 'Service Provider (Offering services)' },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-neutral-bg">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="text-primary font-bold text-3xl tracking-tight">FIXIT</div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-neutral-dark">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-muted">
          Join FIXIT to connect with local service professionals
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card>
          {error && <ErrorState message={error} />}
          <form onSubmit={handleSubmit} className="space-y-2">
            <Input 
              label="Full Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="John Doe"
              required 
            />
            <Input 
              label="Email address" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com"
              required 
            />
            <Input 
              label="Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
            <Select
              label="I am signing up as a"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={roleOptions}
            />
            <div className="pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
          </form>
          <div className="mt-6 text-center text-sm text-neutral-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
              Log in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;
