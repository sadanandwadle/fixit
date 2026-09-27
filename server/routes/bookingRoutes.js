const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyCustomerBookings,
  getMyProviderBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  confirmBooking,
  verifyOtpAndStartService,
  completeService,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer-only booking endpoints
router.post('/', protect, authorize('customer'), createBooking);
router.get('/my-bookings', protect, authorize('customer'), getMyCustomerBookings);
router.put('/:id/confirm', protect, authorize('customer'), confirmBooking);
router.put('/:id/cancel', protect, authorize('customer'), cancelBooking);

// Provider-only booking endpoints
router.get('/provider', protect, authorize('provider'), getMyProviderBookings);
router.put('/:id/accept', protect, authorize('provider'), acceptBooking);
router.put('/:id/reject', protect, authorize('provider'), rejectBooking);
router.put('/:id/verify-otp', protect, authorize('provider'), verifyOtpAndStartService);
router.put('/:id/complete', protect, authorize('provider'), completeService);

// General single booking view (checked by controller for customer/provider/admin)
router.get('/:id', protect, getBookingById);

module.exports = router;
