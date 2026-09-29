const express = require('express');
const { createReview, getProviderReviews, getBookingReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, createReview);

router.route('/provider/:providerId')
  .get(getProviderReviews);

router.route('/booking/:bookingId')
  .get(protect, getBookingReview);

module.exports = router;
