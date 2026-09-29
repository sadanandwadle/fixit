const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  getProviders,
  updateProviderVerification,
  getServices,
  createService,
  updateService,
  getBookings,
  getReviews,
  updateReviewModeration,
  getPayments,
  getAuditLogs
} = require('../controllers/adminController');

const router = express.Router();

// ALL admin routes are protected and require 'admin' role
router.use(protect);
router.use(authorize('admin'));

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Users
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);

// Providers
router.get('/providers', getProviders);
router.put('/providers/:id/verify', updateProviderVerification);

// Services
router.get('/services', getServices);
router.post('/services', createService);
router.put('/services/:id', updateService);

// Bookings
router.get('/bookings', getBookings);

// Reviews
router.get('/reviews', getReviews);
router.put('/reviews/:id/moderate', updateReviewModeration);

// Payments
router.get('/payments', getPayments);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
