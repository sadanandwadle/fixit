const express = require('express');
const router = express.Router();
const {
  createPayment,
  processPayment,
  cancelPayment,
  getPaymentByBooking,
  getMyPayments,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer-only payment management
router.post('/create', protect, authorize('customer'), createPayment);
router.post('/:paymentId/process', protect, authorize('customer'), processPayment);
router.post('/:paymentId/cancel', protect, authorize('customer'), cancelPayment);
router.get('/my-payments', protect, authorize('customer'), getMyPayments);

// Booking payment view (Customer owner, assigned Provider, or Admin)
router.get('/booking/:bookingId', protect, getPaymentByBooking);

module.exports = router;
