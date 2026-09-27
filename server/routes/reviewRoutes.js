const express = require('express');
const router = express.Router();
const {
  createReview,
  getProviderReviews,
  getBookingReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer endpoints
router.post('/', protect, authorize('customer'), createReview);
// Customer & Provider booking review lookup
router.get('/booking/:bookingId', protect, getBookingReview);

// Public provider reviews lookup
router.get('/provider/:providerId', getProviderReviews);

module.exports = router;
