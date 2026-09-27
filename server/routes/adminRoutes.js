const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAdminDashboardStats,
  getAdminUsers,
  getAdminUserById,
  getAdminProviders,
  getAdminProviderById,
  toggleProviderVerification,
  getAdminBookings,
  getAdminBookingById,
  getAdminReviews,
  deleteAdminReview,
  getAdminPayments,
  getAdminPaymentById,
  getAdminServices,
  createAdminService,
  updateAdminService,
  deleteAdminService,
  getAdminNotifications,
} = require('../controllers/adminController');

// All admin routes require authentication with 'admin' role
router.use(protect);
router.use(authorize('admin'));

// 1. Dashboard Overview
router.get('/dashboard', getAdminDashboardStats);
router.get('/stats', getAdminDashboardStats);

// 2. Users Management
router.get('/users', getAdminUsers);
router.get('/users/:id', getAdminUserById);

// 3. Providers Management & Verification
router.get('/providers', getAdminProviders);
router.get('/providers/:id', getAdminProviderById);
router.put('/providers/:id/verify', toggleProviderVerification);

// 4. Bookings Inspection
router.get('/bookings', getAdminBookings);
router.get('/bookings/:id', getAdminBookingById);

// 5. Reviews Moderation
router.get('/reviews', getAdminReviews);
router.delete('/reviews/:id', deleteAdminReview);

// 6. Payments Audit
router.get('/payments', getAdminPayments);
router.get('/payments/:id', getAdminPaymentById);

// 7. Services Catalog Management
router.get('/services', getAdminServices);
router.post('/services', createAdminService);
router.put('/services/:id', updateAdminService);
router.delete('/services/:id', deleteAdminService);

// 8. Notifications System Audit
router.get('/notifications', getAdminNotifications);

module.exports = router;
