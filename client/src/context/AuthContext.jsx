import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI, healthAPI } from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fixit_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('fixit_token') || null);
  const [loading, setLoading] = useState(true);
  const [backendHealth, setBackendHealth] = useState({
    checked: false,
    online: false,
    dbConnected: false,
    message: 'Connecting to server...',
  });

  // Verify backend health on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const res = await healthAPI.check();
        setBackendHealth({
          checked: true,
          online: true,
          dbConnected: res.data?.database?.connected || false,
          message: res.data?.message || 'Server online',
        });
      } catch (err) {
        setBackendHealth({
          checked: true,
          online: false,
          dbConnected: false,
          message: 'Server currently offline',
        });
      }
    };

    testConnection();
  }, []);

  // Fetch current user details if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const res = await authAPI.getMe();
          if (res.data?.success) {
            setUser(res.data.user);
            localStorage.setItem('fixit_user', JSON.stringify(res.data.user));
          }
        } catch (error) {
          console.warn('Session expired or could not verify user profile');
          if (error.response?.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  // Listen for global 401 session expiration event from Axios interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('fixit_token');
      localStorage.removeItem('fixit_user');
    };

    window.addEventListener('fixit_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('fixit_auth_expired', handleAuthExpired);
    };
  }, []);

  // Login handler
  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      if (res.data?.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('fixit_token', receivedToken);
        localStorage.setItem('fixit_user', JSON.stringify(receivedUser));
        return { success: true, user: receivedUser };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Login failed';
      return { success: false, message: msg };
    }
  };

  // Register handler
  const register = async (userData) => {
    try {
      const res = await authAPI.register(userData);
      if (res.data?.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('fixit_token', receivedToken);
        localStorage.setItem('fixit_user', JSON.stringify(receivedUser));
        return { success: true, user: receivedUser };
      }
      return { success: false, message: res.data?.message || 'Registration failed' };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Registration failed';
      return { success: false, message: msg };
    }
  };

  // Logout handler
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fixit_token');
    localStorage.removeItem('fixit_user');
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    backendHealth,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
