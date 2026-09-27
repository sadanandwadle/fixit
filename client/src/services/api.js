import axios from 'axios';

// Create base Axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to inject JWT token into Authorization header
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fixit_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (localStorage.getItem('fixit_token')) {
        localStorage.removeItem('fixit_token');
        localStorage.removeItem('fixit_user');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fixit_auth_expired'));
      }
    }
    return Promise.reject(error);
  }
);

// Health API
export const healthAPI = {
  check: () => API.get('/health'),
};

// Auth API
export const authAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (credentials) => API.post('/auth/login', credentials),
  getMe: () => API.get('/auth/me'),
};

// Services API
export const serviceAPI = {
  getAll: (params) => API.get('/services', { params }),
  getById: (id) => API.get(`/services/${id}`),
};

// Providers API
export const providerAPI = {
  getAll: (params) => API.get('/providers', { params }),
  getNearby: (params) => API.get('/providers/nearby', { params }),
  getById: (id) => API.get(`/providers/${id}`),
  getMyProfile: () => API.get('/providers/me'),
  updateMyProfile: (data) => API.put('/providers/me', data),
  updateLocation: (data) => API.put('/providers/me/location', data),
  createMyProfile: (data) => API.post('/providers/me', data),
};

// Bookings API
export const bookingAPI = {
  create: (bookingData) => API.post('/bookings', bookingData),
  getMyCustomerBookings: (params) => API.get('/bookings/my-bookings', { params }),
  getMyProviderBookings: (params) => API.get('/bookings/provider', { params }),
  getById: (id) => API.get(`/bookings/${id}`),
  accept: (id) => API.put(`/bookings/${id}/accept`),
  reject: (id, reason) => API.put(`/bookings/${id}/reject`, { reason }),
  cancel: (id) => API.put(`/bookings/${id}/cancel`),
  confirm: (id) => API.put(`/bookings/${id}/confirm`),
  verifyOtp: (id, otp) => API.put(`/bookings/${id}/verify-otp`, { otp }),
  complete: (id) => API.put(`/bookings/${id}/complete`),
};

// Availability API
export const availabilityAPI = {
  getMy: () => API.get('/availability/me'),
  updateMy: (schedules) => API.put('/availability/me', { schedules }),
  getProvider: (providerId) => API.get(`/availability/provider/${providerId}`),
};

// Reviews API
export const reviewAPI = {
  create: (data) => API.post('/reviews', data),
  getByProvider: (providerId, params) => API.get(`/reviews/provider/${providerId}`, { params }),
  getByBooking: (bookingId) => API.get(`/reviews/booking/${bookingId}`),
};

// Simulated Demo Payment API (Phase 4A)
export const paymentAPI = {
  create: (bookingId) => API.post('/payments/create', { bookingId }),
  process: (paymentId, data) => API.post(`/payments/${paymentId}/process`, data),
  cancel: (paymentId) => API.post(`/payments/${paymentId}/cancel`),
  getByBooking: (bookingId) => API.get(`/payments/booking/${bookingId}`),
  getMyPayments: () => API.get('/payments/my-payments'),
};

// In-App Notification API (Phase 5)
export const notificationAPI = {
  getAll: (params) => API.get('/notifications', { params }),
  getUnreadCount: () => API.get('/notifications/unread-count'),
  markAsRead: (id) => API.put(`/notifications/${id}/read`),
  markAllAsRead: () => API.put('/notifications/read-all'),
};

// Admin API (Phase 6)
export const adminAPI = {
  getDashboard: () => API.get('/admin/dashboard'),
  getUsers: (params) => API.get('/admin/users', { params }),
  getUserById: (id) => API.get(`/admin/users/${id}`),
  getProviders: (params) => API.get('/admin/providers', { params }),
  getProviderById: (id) => API.get(`/admin/providers/${id}`),
  toggleProviderVerification: (id, isVerified) =>
    API.put(`/admin/providers/${id}/verify`, { isVerified }),
  getBookings: (params) => API.get('/admin/bookings', { params }),
  getBookingById: (id) => API.get(`/admin/bookings/${id}`),
  getReviews: (params) => API.get('/admin/reviews', { params }),
  deleteReview: (id) => API.delete(`/admin/reviews/${id}`),
  getPayments: (params) => API.get('/admin/payments', { params }),
  getPaymentById: (id) => API.get(`/admin/payments/${id}`),
  getServices: () => API.get('/admin/services'),
  createService: (data) => API.post('/admin/services', data),
  updateService: (id, data) => API.put(`/admin/services/${id}`, data),
  deleteService: (id) => API.delete(`/admin/services/${id}`),
  getNotifications: (params) => API.get('/admin/notifications', { params }),
};

export default API;
